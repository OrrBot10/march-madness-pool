import { asc, desc, eq, inArray } from "drizzle-orm";
import { after, connection } from "next/server";
import { getDb } from "@/lib/db";
import { entries, games, people, picks, seasons, teams } from "@/lib/db/schema";
import type { Entry, Team } from "@/lib/pool/engine";
import { deriveResults } from "@/lib/pool/results";
import type { Region } from "@/lib/pool/rules";
import { syncSeason } from "@/lib/sync";

export type Season = typeof seasons.$inferSelect;
export type Game = typeof games.$inferSelect;

export interface SeasonEntry extends Entry {
  entryId: number;
  personId: number | null;
  paid: boolean;
  updatedAt: Date;
}

/** How stale results may get before a page view triggers a background ESPN sync. */
const SYNC_EVERY_MS = 5 * 60 * 1000;

export async function getCurrentSeason(): Promise<Season | null> {
  // Picks and results change constantly; never bake them into the prerendered shell.
  await connection();
  const db = await getDb();
  const [season] = await db.select().from(seasons).where(eq(seasons.active, true)).limit(1);
  if (season) syncInBackgroundIfStale(season);
  return season ?? null;
}

export async function getSeason(year: number): Promise<Season | null> {
  await connection();
  const db = await getDb();
  const [season] = await db.select().from(seasons).where(eq(seasons.year, year));
  return season ?? null;
}

export async function getSeasons(): Promise<Season[]> {
  await connection();
  const db = await getDb();
  return db.select().from(seasons).orderBy(desc(seasons.year));
}

/**
 * During the tournament, any page view refreshes results from ESPN once they're a couple of minutes old.
 * The sync runs after the response is sent, so the viewer never waits on ESPN.
 */
function syncInBackgroundIfStale(season: Season) {
  if (!season.startDay || season.status === "setup" || season.status === "complete") return;
  if (season.lockAt.getTime() - Date.now() > 3 * 24 * 60 * 60 * 1000) return; // nothing to fetch yet
  if (season.lastSyncAt && Date.now() - season.lastSyncAt.getTime() < SYNC_EVERY_MS) return;
  after(() => syncSeason(season.year).catch((err) => console.error("ESPN sync failed", err)));
}

export function picksLocked(season: Season, now = new Date()): boolean {
  return season.status !== "open" || now >= season.lockAt;
}

/** The winner that counts: the admin's override, else ESPN's once the game is final. */
export function effectiveWinner(g: Game): string | null {
  return g.overrideWinnerEspnId ?? (g.state === "post" ? g.winnerEspnId : null);
}

export async function getSeasonData(year: number) {
  const db = await getDb();
  const teamRows = await db.select().from(teams).where(eq(teams.year, year));
  const gameRows = await db.select().from(games).where(eq(games.year, year)).orderBy(asc(games.startAt));
  const entryRows = await db.select().from(entries).where(eq(entries.year, year)).orderBy(entries.id);
  const pickRows = entryRows.length
    ? await db.select().from(picks).where(inArray(picks.entryId, entryRows.map((e) => e.id)))
    : [];

  const results = deriveResults(
    teamRows,
    gameRows.map((g) => ({ round: g.round, teamIds: [g.aEspnId, g.bEspnId], winnerId: effectiveWinner(g) })),
  );

  const picksByEntry = new Map<number, Record<string, number>>();
  for (const p of pickRows) {
    const m = picksByEntry.get(p.entryId) ?? {};
    m[p.teamId] = p.shares;
    picksByEntry.set(p.entryId, m);
  }

  const teamList: (Team & { espnIds: string[] })[] = teamRows.map((t) => ({
    id: t.id,
    region: t.region as Region,
    seed: t.seed,
    name: t.name,
    espnIds: t.espnIds,
    wins: results.wins[t.id],
    eliminated: results.eliminated[t.id],
  }));
  const entryList: SeasonEntry[] = entryRows.map((e) => ({
    id: String(e.id),
    entryId: e.id,
    name: e.name,
    entryFee: e.entryFee,
    personId: e.personId,
    paid: e.paid,
    updatedAt: e.updatedAt,
    picks: picksByEntry.get(e.id) ?? {},
  }));
  return { teams: teamList, entries: entryList, games: gameRows, completedRounds: results.completedRounds };
}

export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "joshrorr@hotmail.com").toLowerCase().split(",").map((s) => s.trim());
}

export async function findOrCreatePerson(name: string, email: string) {
  const db = await getDb();
  const normalized = email.trim().toLowerCase();
  const [found] = await db.select().from(people).where(eq(people.email, normalized));
  if (found) return found;
  const [created] = await db.insert(people).values({ name: name.trim(), email: normalized }).returning();
  return created;
}

export async function createEntry(year: number, personId: number | null, name: string) {
  const db = await getDb();
  const [row] = await db.insert(entries).values({ year, personId, name: name.trim() }).returning();
  return row;
}

export async function getEntry(entryId: number) {
  const db = await getDb();
  const [row] = await db.select().from(entries).where(eq(entries.id, entryId));
  return row ?? null;
}

/** Replaces an entry's picks. Callers must check ownership and the lock first. */
export async function replacePicks(entryId: number, shares: Record<string, number>) {
  const db = await getDb();
  await db.transaction(async (tx) => {
    await tx.delete(picks).where(eq(picks.entryId, entryId));
    const rows = Object.entries(shares)
      .filter(([, n]) => n > 0)
      .map(([teamId, n]) => ({ entryId, teamId, shares: n }));
    if (rows.length) await tx.insert(picks).values(rows);
    await tx.update(entries).set({ updatedAt: new Date() }).where(eq(entries.id, entryId));
  });
}
