import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildBracket, parseScoreboard, type EspnGame } from "./espn";
import { computePool } from "./pool/engine";
import type { HistoryYear } from "./pool/history";
import { deriveResults } from "./pool/results";

const root = path.join(import.meta.dirname, "..", "..");
const fixture: Record<string, unknown> = JSON.parse(
  readFileSync(path.join(root, "test", "fixtures", "espn-2026.json"), "utf8"),
);
const history: HistoryYear = JSON.parse(readFileSync(path.join(root, "data", "history", "2026.json"), "utf8"));

const days = Object.keys(fixture).sort();
const gamesThrough = (lastDay: string): EspnGame[] =>
  days.filter((d) => d <= lastDay).flatMap((d) => parseScoreboard(fixture[d]));
const allGames = gamesThrough("99999999");

const outcomes = (games: EspnGame[]) =>
  games.map((g) => ({
    round: g.round,
    teamIds: [g.competitors[0].espnId, g.competitors[1].espnId] as [string | null, string | null],
    winnerId: g.state === "post" ? (g.competitors.find((c) => c.winner)?.espnId ?? null) : null,
  }));

describe("ESPN 2026 tournament", () => {
  it("parses all 67 games with rounds and regions", () => {
    expect(allGames).toHaveLength(67);
    expect(allGames.filter((g) => g.round === 0)).toHaveLength(4);
    expect(allGames.filter((g) => g.round === 1)).toHaveLength(32);
    expect(allGames.filter((g) => g.round === 6)).toHaveLength(1);
    expect(allGames.filter((g) => g.round <= 4).every((g) => g.region)).toBe(true);
  });

  it("builds the same 64-slot bracket as the 2026 workbook", () => {
    const bracket = buildBracket(allGames);
    expect(bracket).toHaveLength(64);
    expect(bracket.map((s) => s.id).sort()).toEqual(history.teams.map((t) => t.id).sort());
    const playIns = bracket.filter((s) => s.espnIds.length === 2);
    expect(playIns.map((s) => s.id).sort()).toEqual(["east-16", "midwest-11", "midwest-16", "south-16", "west-11"].filter((id) =>
      history.teams.find((t) => t.id === id)!.name.includes("/"),
    ));
  });

  it("derives the same wins and eliminations the workbook recorded", () => {
    const bracket = buildBracket(allGames);
    const r = deriveResults(bracket, outcomes(allGames));
    expect(r.completedRounds).toBe(6);
    for (const t of history.teams) {
      expect({ id: t.id, wins: r.wins[t.id] }).toEqual({ id: t.id, wins: t.wins });
    }
  });

  it("pays out exactly what the engine pays from the workbook", () => {
    const bracket = buildBracket(allGames);
    const r = deriveResults(bracket, outcomes(allGames));
    const teams = history.teams.map((t) => ({ ...t, wins: r.wins[t.id], eliminated: r.eliminated[t.id] }));
    const fromEspn = computePool({ teams, entries: history.entries, completedRounds: r.completedRounds });
    const fromSheet = computePool(history);
    expect(fromEspn.entries.map((e) => e.net.toFixed(2))).toEqual(fromSheet.entries.map((e) => e.net.toFixed(2)));
  });

  it("only counts a round once every game in it is final", () => {
    // After the first day of the Round of 64, half the round is final: nothing is complete.
    const bracket = buildBracket(allGames);
    expect(deriveResults(bracket, outcomes(gamesThrough("20260319"))).completedRounds).toBe(0);
    expect(deriveResults(bracket, outcomes(gamesThrough("20260320"))).completedRounds).toBe(1);
    expect(deriveResults(bracket, outcomes(gamesThrough("20260326"))).completedRounds).toBe(2);
    expect(deriveResults(bracket, outcomes(gamesThrough("20260327"))).completedRounds).toBe(3);
    expect(deriveResults(bracket, outcomes(gamesThrough("20260329"))).completedRounds).toBe(4);
  });
});
