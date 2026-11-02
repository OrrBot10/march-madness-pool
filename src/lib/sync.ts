import { and, eq, gt } from "drizzle-orm";
import { getDb, type DB } from "@/lib/db";
import { games, seasons, teams } from "@/lib/db/schema";
import { addDays, buildBracket, easternDay, fetchDay, type EspnGame } from "@/lib/espn";

/** ESPN's tournament runs about three weeks from the First Four. */
const TOURNAMENT_DAYS = 22;

function gameRow(year: number, g: EspnGame) {
  const [a, b] = g.competitors;
  return {
    year,
    espnId: g.espnId,
    round: g.round,
    region: g.region,
    startAt: new Date(g.startAt),
    state: g.state,
    detail: g.detail,
    aEspnId: a.espnId,
    aName: a.name,
    aSeed: a.seed,
    aScore: a.score,
    bEspnId: b.espnId,
    bName: b.name,
    bSeed: b.seed,
    bScore: b.score,
    winnerEspnId: g.state === "post" ? (g.competitors.find((c) => c.winner)?.espnId ?? null) : null,
  };
}

export async function upsertGames(db: DB, year: number, list: EspnGame[]) {
  for (const g of list) {
    const row = gameRow(year, g);
    const update: Partial<typeof row> = { ...row };
    delete update.year;
    delete update.espnId;
    await db.insert(games).values(row).onConflictDoUpdate({ target: [games.year, games.espnId], set: update });
  }
}

/** Creates a season from ESPN's First Four and Round of 64 games. Picks open once the admin publishes it. */
export async function createSeasonFromEspn(year: number, startDay: string, fetcher = fetchDay) {
  const db = await getDb();
  const [existing] = await db.select().from(seasons).where(eq(seasons.year, year));
  if (existing) throw new Error(`${year} already exists`);

  const fetched: EspnGame[] = [];
  for (let i = 0; i < 4; i++) fetched.push(...(await fetcher(addDays(startDay, i))));
  await insertSeason(db, { year, startDay, games: fetched, status: "setup" });
}

/** Shared by the admin "new season" flow and the local test seed. */
export async function insertSeason(
  db: DB,
  opts: { year: number; startDay: string; games: EspnGame[]; status: "setup" | "open" | "locked"; asOfDay?: string },
) {
  const bracket = buildBracket(opts.games);
  const r64 = opts.games.filter((g) => g.round === 1).map((g) => new Date(g.startAt).getTime());
  if (r64.length === 0) throw new Error("No Round of 64 games found; check the start date");
  await db.insert(seasons).values({
    year: opts.year,
    status: opts.status,
    lockAt: new Date(Math.min(...r64)),
    startDay: opts.startDay,
    asOfDay: opts.asOfDay ?? null,
  });
  await db.insert(teams).values(
    bracket.map((s) => ({ year: opts.year, id: s.id, region: s.region, seed: s.seed, name: s.name, espnIds: s.espnIds })),
  );
  const asOf = opts.asOfDay;
  await upsertGames(db, opts.year, asOf ? opts.games.filter((g) => easternDay(new Date(g.startAt)) <= asOf) : opts.games);
}

/** Re-reads the bracket from ESPN, keeping any names the admin edited. Slot ids (region + seed) don't change. */
export async function refreshBracket(year: number, fetcher = fetchDay) {
  const db = await getDb();
  const [season] = await db.select().from(seasons).where(eq(seasons.year, year));
  if (!season?.startDay) throw new Error(`${year} isn't linked to ESPN`);
  const fetched: EspnGame[] = [];
  for (let i = 0; i < 4; i++) fetched.push(...(await fetcher(addDays(season.startDay, i))));
  const bracket = buildBracket(fetched);
  for (const s of bracket) {
    await db
      .update(teams)
      .set({ espnIds: s.espnIds })
      .where(and(eq(teams.year, year), eq(teams.id, s.id)));
  }
  await upsertGames(db, year, fetched);
}

const inFlight = new Map<number, Promise<void>>();

/**
 * Fetches every tournament day up to today (or the season's as-of day) that isn't already final,
 * and stores the games. Safe to call often; concurrent calls share one run.
 */
export function syncSeason(year: number, opts: { fetcher?: typeof fetchDay; db?: DB } = {}): Promise<void> {
  const running = inFlight.get(year);
  if (running) return running;
  const run = doSync(year, opts.fetcher ?? fetchDay, opts.db).finally(() => inFlight.delete(year));
  inFlight.set(year, run);
  return run;
}

async function doSync(year: number, fetcher: typeof fetchDay, dbOverride?: DB) {
  const db = dbOverride ?? (await getDb());
  const [season] = await db.select().from(seasons).where(eq(seasons.year, year));
  if (!season?.startDay) return;

  const today = easternDay(new Date());
  const lastDay = [today, season.asOfDay ?? "99999999", addDays(season.startDay, TOURNAMENT_DAYS - 1)].sort()[0];
  const synced = new Set(season.syncedDays);

  try {
    if (season.asOfDay) {
      // Testing with a past tournament: drop anything after the as-of day.
      const after = new Date(Date.UTC(+lastDay.slice(0, 4), +lastDay.slice(4, 6) - 1, +lastDay.slice(6, 8) + 1, 9));
      await db.delete(games).where(and(eq(games.year, year), gt(games.startAt, after)));
      for (const d of [...synced]) if (d > lastDay) synced.delete(d);
    }
    for (let day = season.startDay; day <= lastDay; day = addDays(day, 1)) {
      if (synced.has(day)) continue;
      const list = await fetcher(day);
      await upsertGames(db, year, list);
      const finished = day < today && list.every((g) => g.state === "post");
      if (finished) synced.add(day);
    }
    await db
      .update(seasons)
      .set({ syncedDays: [...synced].sort(), lastSyncAt: new Date(), lastSyncError: null })
      .where(eq(seasons.year, year));
  } catch (err) {
    await db
      .update(seasons)
      .set({ lastSyncAt: new Date(), lastSyncError: String(err instanceof Error ? err.message : err) })
      .where(eq(seasons.year, year));
    throw err;
  }
}

/** Sets or clears an admin override for a game's winner. */
export async function setOverride(year: number, espnId: string, winnerEspnId: string | null) {
  const db = await getDb();
  await db
    .update(games)
    .set({ overrideWinnerEspnId: winnerEspnId })
    .where(and(eq(games.year, year), eq(games.espnId, espnId)));
}

export async function clearSyncedDays(year: number) {
  const db = await getDb();
  await db.update(seasons).set({ syncedDays: [] }).where(eq(seasons.year, year));
}
