import type { Entry, PoolInput, Team } from "./engine";

/** One past year, imported from that year's workbook by scripts/import-history.ts. */
export interface HistoryYear extends PoolInput {
  year: number;
  teams: Team[];
  entries: Entry[];
  /** Per-entry totals as the spreadsheet reported them. */
  reference: { name: string; spent: number; winnings: number; bonuses: number; paid: boolean }[];
}
