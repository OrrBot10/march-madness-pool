// Converts the yearly Excel workbooks into data/history/<year>.json.
// Usage: npx tsx scripts/import-history.ts "<folder with the .xlsx files>"
import ExcelJS from "exceljs";
import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Region } from "../src/lib/pool/rules";
import type { HistoryYear } from "../src/lib/pool/history";

function value(cell: ExcelJS.Cell): unknown {
  const v = cell.value;
  if (v && typeof v === "object") {
    if ("result" in v) return v.result;
    if ("richText" in v) return v.richText.map((r) => r.text).join("");
    if ("text" in v) return v.text;
  }
  return v;
}

function text(cell: ExcelJS.Cell): string {
  const v = value(cell);
  return v === null || v === undefined ? "" : String(v).trim();
}

function num(cell: ExcelJS.Cell): number | null {
  const v = value(cell);
  return typeof v === "number" ? v : null;
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function importYear(file: string, year: number): Promise<HistoryYear> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  const picks = wb.getWorksheet("Picks")!;
  const results = wb.getWorksheet("Results")!;
  const money = wb.getWorksheet("Money Standings")!;

  // Player columns start at E and run until the "Total Shares" column.
  const players: { col: number; name: string; fee: number }[] = [];
  for (let col = 5; ; col++) {
    const name = text(picks.getRow(1).getCell(col));
    if (name.toLowerCase() === "total shares" || col > 60) break;
    if (!name || name.toLowerCase() === "open") continue;
    players.push({ col, name, fee: num(picks.getRow(3).getCell(col)) ?? 0 });
  }

  // Team rows sit under "<Region> Region" headers in column A.
  const teams: HistoryYear["teams"] = [];
  const picksByPlayer = new Map<string, Record<string, number>>(players.map((p) => [p.name, {}]));
  let region: Region | null = null;
  picks.eachRow((row, rowNumber) => {
    const a = text(row.getCell(1));
    const header = a.match(/^(South|West|East|Midwest)\b/i);
    if (header) {
      region = (header[1][0].toUpperCase() + header[1].slice(1).toLowerCase()) as Region;
      return;
    }
    const seed = num(row.getCell(1));
    const name = text(row.getCell(2));
    if (!region || seed === null || !name || rowNumber < 5) return;
    const id = `${slug(region)}-${seed}`;
    teams.push({ id, region, seed, name, wins: 0, eliminated: false });
    for (const p of players) {
      const shares = num(row.getCell(p.col));
      if (shares) picksByPlayer.get(p.name)![id] = shares;
    }
  });

  // Results: a number in a round column (D..I) means the team won that round; "x" means it was out.
  const teamByName = new Map(teams.map((t) => [t.name, t]));
  results.eachRow((row) => {
    const t = teamByName.get(text(row.getCell(2)));
    if (!t) return;
    for (let col = 4; col <= 9; col++) {
      const cell = row.getCell(col);
      if (num(cell) !== null) t.wins++;
      else if (text(cell).toLowerCase() === "x") t.eliminated = true;
    }
  });

  // What the spreadsheet itself reported, kept for checking the engine against it.
  const reference: HistoryYear["reference"] = [];
  money.eachRow((row) => {
    const name = text(row.getCell(2));
    if (!picksByPlayer.has(name)) return;
    reference.push({
      name,
      spent: num(row.getCell(3)) ?? 0,
      winnings: num(row.getCell(5)) ?? 0,
      bonuses: num(row.getCell(7)) ?? 0,
      paid: /pd/i.test(text(row.getCell(11))),
    });
  });

  const entries = players
    .filter((p) => p.fee > 0 || Object.keys(picksByPlayer.get(p.name)!).length > 0)
    .map((p) => ({ id: slug(p.name), name: p.name, entryFee: p.fee, picks: picksByPlayer.get(p.name)! }));

  return { year, teams, entries, completedRounds: 6, reference };
}

async function main() {
  const folder = process.argv[2];
  if (!folder) throw new Error("Pass the folder that holds the yearly .xlsx files");
  const outDir = path.join(import.meta.dirname, "..", "data", "history");
  mkdirSync(outDir, { recursive: true });
  for (const file of readdirSync(folder).filter((f) => /^\d{4} .*\.xlsx$/i.test(f))) {
    const year = Number(file.slice(0, 4));
    const data = await importYear(path.join(folder, file), year);
    writeFileSync(path.join(outDir, `${year}.json`), JSON.stringify(data, null, 2) + "\n");
    console.log(`${year}: ${data.teams.length} teams, ${data.entries.length} entries`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
