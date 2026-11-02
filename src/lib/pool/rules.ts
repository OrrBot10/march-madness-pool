// Pool rules, unchanged 2022–2026. See the Rules tab of any year's workbook.

export const REGIONS = ["South", "West", "East", "Midwest"] as const;
export type Region = (typeof REGIONS)[number];

/** Share price by seed (index 0 = 1 seed). */
export const PRICE_BY_SEED = [20, 18, 16, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2] as const;

export function priceForSeed(seed: number): number {
  const price = PRICE_BY_SEED[seed - 1];
  if (price === undefined) throw new Error(`Invalid seed ${seed}`);
  return price;
}

export const ENTRY_FEE = 10;

/** Rounds, 1-based. Round N is "won" by a team that wins its Nth tournament game (First Four excluded). */
export const ROUNDS = [
  { round: 1, name: "Round of 64", short: "R64", potPct: 0.25 },
  { round: 2, name: "Round of 32", short: "R32", potPct: 0.2 },
  { round: 3, name: "Sweet 16", short: "S16", potPct: 0.2 },
  { round: 4, name: "Elite 8", short: "E8", potPct: 0.15 },
  { round: 5, name: "Final Four", short: "F4", potPct: 0.1 },
  { round: 6, name: "Championship", short: "Final", potPct: 0.1 },
] as const;

/**
 * Lowest-seed bonuses, paid from entry fees. `round` is the round the team must win:
 * winning round 2 means reaching the Sweet 16, and so on. Only teams someone owns count.
 */
export const BONUSES = [
  { round: 1, name: "Lowest seed to win a game", feePct: 0.3 },
  { round: 2, name: "Lowest seed to reach the Sweet 16", feePct: 0.3 },
  { round: 3, name: "Lowest seed to reach the Elite 8", feePct: 0.2 },
  { round: 4, name: "Lowest seed to reach the Final Four", feePct: 0.2 },
] as const;
