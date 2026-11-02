import { readFileSync } from "node:fs";
import path from "node:path";
import { parseScoreboard } from "@/lib/espn";
import type { HistoryYear } from "@/lib/pool/history";
import { insertSeason } from "@/lib/sync";
import type { DB } from "./index";
import { entries, picks, seasons, teams } from "./schema";

/**
 * Local test data, created the first time the database opens:
 * - 2027 demo: open for picks, on the 2026 bracket, with last year's entries. Active.
 * - 2026 replay: the real 2026 tournament from saved ESPN data, with the real entries,
 *   results as of the end of the Round of 64. Admins can move the as-of day to replay it.
 */
export async function seedLocalSeasons(db: DB) {
  const existing = await db.select().from(seasons).limit(1);
  if (existing.length > 0) return;

  const history: HistoryYear = JSON.parse(readFileSync(path.join(process.cwd(), "data", "history", "2026.json"), "utf8"));

  await db.insert(seasons).values({ year: 2027, status: "open", active: true, lockAt: new Date("2027-03-18T16:15:00Z") });
  await db.insert(teams).values(history.teams.map((t) => ({ year: 2027, id: t.id, region: t.region, seed: t.seed, name: t.name })));
  await copyEntries(db, 2027, history);

  const fixture: Record<string, unknown> = JSON.parse(
    readFileSync(path.join(process.cwd(), "test", "fixtures", "espn-2026.json"), "utf8"),
  );
  const espnGames = Object.keys(fixture).sort().flatMap((day) => parseScoreboard(fixture[day]));
  await insertSeason(db, { year: 2026, startDay: "20260317", games: espnGames, status: "locked", asOfDay: "20260320" });
  await copyEntries(db, 2026, history);
}

async function copyEntries(db: DB, year: number, from: HistoryYear) {
  for (const e of from.entries) {
    const ref = from.reference.find((r) => r.name === e.name);
    const [row] = await db
      .insert(entries)
      .values({ year, name: e.name, entryFee: e.entryFee, paid: year === from.year && !!ref?.paid })
      .returning({ id: entries.id });
    const rows = Object.entries(e.picks).map(([teamId, shares]) => ({ entryId: row.id, teamId, shares }));
    if (rows.length) await db.insert(picks).values(rows);
  }
}
