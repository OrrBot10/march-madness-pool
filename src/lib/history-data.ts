import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import type { HistoryYear } from "@/lib/pool/history";

const dir = path.join(process.cwd(), "data", "history");

export function historyYears(): number[] {
  return readdirSync(dir)
    .filter((f) => /^\d{4}\.json$/.test(f))
    .map((f) => Number(f.slice(0, 4)))
    .sort((a, b) => b - a);
}

export function loadHistoryYear(year: number): HistoryYear | null {
  try {
    return JSON.parse(readFileSync(path.join(dir, `${year}.json`), "utf8"));
  } catch {
    return null;
  }
}
