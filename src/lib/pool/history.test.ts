import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { computePool } from "./engine";
import type { HistoryYear } from "./history";

const dir = path.join(import.meta.dirname, "..", "..", "..", "data", "history");
const years: HistoryYear[] = readdirSync(dir)
  .filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(readFileSync(path.join(dir, f), "utf8")));

/**
 * Known errors in the spreadsheets themselves, found while auditing them (Nov 2026).
 * The engine is right in these cases; the expected value here is what the sheet should have shown.
 */
const SHEET_ERRORS: Record<number, Record<string, { winnings?: number; bonuses?: number }>> = {
  2026: {
    // Miami's round-1 dividend formula was #REF!, so its 3 owners got $0 for that win (4.5767 - shares were still counted).
    // Round 1 also divided by 375 shares, so the dividend itself is unchanged.
    "Aaryn P": { winnings: 4.5767 },
    Oz: { winnings: 4.5767 },
    "Dan P": { winnings: 4.5767 },
    // Typed as $16; 2 Illinois shares x $6 Final Four bonus = $12.
    "Tyler V": { bonuses: -4 },
  },
};

describe.each(years.map((y) => [y.year, y] as const))("%i matches the spreadsheet", (year, data) => {
  const result = computePool(data);

  it("has a 64-team bracket with one champion", () => {
    expect(data.teams).toHaveLength(64);
    expect(data.teams.filter((t) => t.wins === 6)).toHaveLength(1);
  });

  it.each(data.reference.map((r) => [r.name, r] as const))("%s", (name, ref) => {
    const mine = result.entries.find((e) => e.name === name)!;
    const fix = SHEET_ERRORS[year]?.[name] ?? {};
    expect(mine.spent).toBe(ref.spent);
    expect(mine.winnings).toBeCloseTo(ref.winnings + (fix.winnings ?? 0), 2);
    // Bonuses were typed in by hand, rounded to the cent per share (2025's $0.565 F4 bonus was typed as $0.57,
    // which is 10¢ over for Josh U's 20 shares).
    expect(Math.abs(mine.bonuses - (ref.bonuses + (fix.bonuses ?? 0)))).toBeLessThan(0.11);
  });
});
