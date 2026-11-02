import { describe, expect, it } from "vitest";
import { computePool, type Entry, type Team } from "./engine";

function team(id: string, seed: number, wins: number, eliminated = false): Team {
  return { id, region: "South", seed, name: id, wins, eliminated };
}

function entry(id: string, picks: Record<string, number>): Entry {
  return { id, name: id, entryFee: 10, picks };
}

describe("round dividends", () => {
  it("splits each round's pool across the shares that won that round", () => {
    // 1 seed ($20) x 10 shares + 16 seed ($2) x 10 shares = $220 pot.
    const teams = [team("fav", 1, 1), team("dog", 16, 0, true)];
    const entries = [entry("a", { fav: 6, dog: 4 }), entry("b", { fav: 4, dog: 6 })];
    const r = computePool({ teams, entries, completedRounds: 1 });

    expect(r.pot).toBe(220);
    expect(r.rounds[0].pool).toBe(55);
    expect(r.rounds[0].winningShares).toBe(10);
    expect(r.rounds[0].dividend).toBe(5.5);
    expect(r.entries.find((e) => e.entryId === "a")!.winnings).toBeCloseTo(33);
    expect(r.entries.find((e) => e.entryId === "b")!.winnings).toBeCloseTo(22);
  });

  it("matches the Rules tab example: $2500 pot, 100 of 150 shares advance -> $6.25", () => {
    // 125 shares of a 1 seed ($2500), 100 advance on one team, 25 lose on another.
    const teams = [team("w", 1, 1), team("l", 1, 0, true)];
    const entries = [entry("x", { w: 100, l: 25 })];
    const r = computePool({ teams, entries, completedRounds: 1 });
    expect(r.pot).toBe(2500);
    expect(r.rounds[0].dividend).toBe(6.25);
  });

  it("pays nothing for a round until the whole round is complete", () => {
    const teams = [team("a", 1, 1), team("b", 16, 0, true)];
    const r = computePool({ teams, entries: [entry("x", { a: 1, b: 1 })], completedRounds: 0 });
    expect(r.rounds[0].dividend).toBe(0);
    expect(r.entries[0].winnings).toBe(0);
    expect(r.bonuses[0].seed).toBeNull();
  });
});

describe("lowest-seed bonuses", () => {
  it("skips an unowned low seed and goes to the next lowest owned seed", () => {
    const teams = [team("s15", 15, 1), team("s12", 12, 1), team("s5", 5, 0, true)];
    const entries = [entry("a", { s12: 2, s5: 1 }), entry("b", { s12: 1 })];
    const r = computePool({ teams, entries, completedRounds: 1 });
    const bonus = r.bonuses[0];
    expect(bonus.seed).toBe(12);
    expect(bonus.amount).toBe(6); // 30% of $20 in fees
    expect(bonus.perShare).toBe(2);
    expect(r.entries.find((e) => e.entryId === "a")!.bonuses).toBe(4);
  });

  it("splits per share across every team tied at the lowest seed", () => {
    // 2025: Colorado St and McNeese, both 12 seeds.
    const teams = [team("csu", 12, 1), team("mcn", 12, 1)];
    const entries = [entry("a", { csu: 3 }), entry("b", { mcn: 1 })];
    const r = computePool({ teams, entries, completedRounds: 1 });
    expect(r.bonuses[0].teamIds.sort()).toEqual(["csu", "mcn"]);
    expect(r.bonuses[0].shares).toBe(4);
    expect(r.bonuses[0].perShare).toBe(1.5);
  });

  it("counts a team for every later bonus it qualifies for", () => {
    // 2022: St. Peter's (15 seed) won the first three bonuses.
    const teams = [team("stp", 15, 3, true), team("unc", 8, 5, true)];
    const entries = [entry("a", { stp: 1 }), entry("b", { unc: 1 })];
    const r = computePool({ teams, entries, completedRounds: 6 });
    expect(r.bonuses.map((b) => b.seed)).toEqual([15, 15, 15, 8]);
  });
});

describe("entry totals", () => {
  it("nets winnings and bonuses against spend and entry fee", () => {
    const teams = [team("a", 16, 1)];
    const r = computePool({ teams, entries: [entry("x", { a: 1 })], completedRounds: 1 });
    // pot $2, R64 pool $0.50; bonus 30% of $10 = $3.
    expect(r.entries[0].winnings).toBe(0.5);
    expect(r.entries[0].bonuses).toBe(3);
    expect(r.entries[0].net).toBeCloseTo(0.5 + 3 - 2 - 10);
  });
});
