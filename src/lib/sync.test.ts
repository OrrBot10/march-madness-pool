import { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import type { DB } from "./db";
import * as schema from "./db/schema";
import { parseScoreboard } from "./espn";
import { computePool } from "./pool/engine";
import type { HistoryYear } from "./pool/history";
import { deriveResults } from "./pool/results";
import { insertSeason, syncSeason } from "./sync";

const root = path.join(import.meta.dirname, "..", "..");
const fixture: Record<string, unknown> = JSON.parse(readFileSync(path.join(root, "test", "fixtures", "espn-2026.json"), "utf8"));
const history: HistoryYear = JSON.parse(readFileSync(path.join(root, "data", "history", "2026.json"), "utf8"));
const fakeEspn = async (day: string) => parseScoreboard(fixture[day] ?? { events: [] });

let db: DB;

beforeEach(async () => {
  db = drizzle(new PGlite(), { schema });
  await migrate(db, { migrationsFolder: path.join(root, "drizzle") });
  // Same as the admin "new season" flow: First Four + Round of 64 days only.
  const opening = ["20260317", "20260318", "20260319", "20260320"].flatMap((d) => parseScoreboard(fixture[d]));
  await insertSeason(db, { year: 2026, startDay: "20260317", games: opening, status: "locked", asOfDay: "20260318" });
});

async function standings() {
  const teams = await db.select().from(schema.teams);
  const games = await db.select().from(schema.games);
  const r = deriveResults(
    teams,
    games.map((g) => ({
      round: g.round,
      teamIds: [g.aEspnId, g.bEspnId],
      winnerId: g.overrideWinnerEspnId ?? (g.state === "post" ? g.winnerEspnId : null),
    })),
  );
  const pool = computePool({
    teams: history.teams.map((t) => ({ ...t, wins: r.wins[t.id], eliminated: r.eliminated[t.id] })),
    entries: history.entries,
    completedRounds: r.completedRounds,
  });
  return { ...pool, completedRounds: r.completedRounds, games };
}

async function setAsOf(day: string) {
  await db.update(schema.seasons).set({ asOfDay: day, syncedDays: [] }).where(eq(schema.seasons.year, 2026));
  await syncSeason(2026, { fetcher: fakeEspn, db });
}

describe("syncing the 2026 tournament from ESPN", () => {
  it("creates the season with the lock at the first Round of 64 tip-off", async () => {
    const [season] = await db.select().from(schema.seasons);
    expect(season.lockAt.toISOString()).toBe("2026-03-19T16:15:00.000Z");
    expect((await db.select().from(schema.teams)).length).toBe(64);
  });

  it("matches the Round of 64 email: 375 shares advance at $4.58, High Point bonus $11.25", async () => {
    await setAsOf("20260320");
    const s = await standings();
    expect(s.completedRounds).toBe(1);
    expect(s.rounds[0].winningShares).toBe(375);
    expect(s.rounds[0].dividend.toFixed(2)).toBe("4.58");
    expect(s.bonuses[0].perShare.toFixed(2)).toBe("11.25");
  });

  it("matches the Round of 32 email: $5.22 per share, Texas bonus to 7 shares", async () => {
    await setAsOf("20260322");
    const s = await standings();
    expect(s.completedRounds).toBe(2);
    expect(s.rounds[1].dividend.toFixed(2)).toBe("5.22");
    expect(s.bonuses[1].teamIds).toEqual(["west-11"]);
    expect(s.bonuses[1].shares).toBe(7);
  });

  it("holds back a round's payouts until its last game is final", async () => {
    await setAsOf("20260326"); // first day of the Sweet 16
    const s = await standings();
    expect(s.completedRounds).toBe(2);
    expect(s.rounds[2].dividend).toBe(0);
  });

  it("moving the as-of day back removes later games", async () => {
    await setAsOf("20260406");
    expect((await standings()).completedRounds).toBe(6);
    await setAsOf("20260319");
    const s = await standings();
    expect(s.completedRounds).toBe(0);
    expect(s.games.filter((g) => g.round >= 2)).toHaveLength(0);
  });

  it("an admin override beats ESPN's result", async () => {
    await setAsOf("20260320");
    // Hand the Duke–Siena game to Siena.
    const [game] = (await db.select().from(schema.games)).filter((g) => g.aName === "Duke" || g.bName === "Duke");
    const siena = game.aName === "Duke" ? game.bEspnId : game.aEspnId;
    await db.update(schema.games).set({ overrideWinnerEspnId: siena }).where(eq(schema.games.espnId, game.espnId));
    const s = await standings();
    // Duke had 38 shares, Siena none: 375 - 38 = 337 winning shares.
    expect(s.rounds[0].winningShares).toBe(337);
    // A later sync must not undo the override.
    await syncSeason(2026, { fetcher: fakeEspn, db });
    expect((await standings()).rounds[0].winningShares).toBe(337);
  });
});
