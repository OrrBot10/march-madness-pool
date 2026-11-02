// Saves a trimmed copy of ESPN's scoreboard for a whole tournament, for tests.
// Usage: npx tsx scripts/fetch-espn-fixture.ts 2026 20260317 20260407
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { addDays, stripScoreboard } from "../src/lib/espn";

async function main() {
  const [year, from, to] = process.argv.slice(2);
  if (!year || !from || !to) throw new Error("Usage: <year> <YYYYMMDD from> <YYYYMMDD to>");
  const days: Record<string, unknown> = {};
  for (let day = from; day <= to; day = addDays(day, 1)) {
    const url = `https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard?dates=${day}&groups=100&limit=200`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${day}: HTTP ${res.status}`);
    const stripped = stripScoreboard(await res.json());
    if (stripped.events.length) days[day] = stripped;
    console.log(day, stripped.events.length);
  }
  const out = path.join(import.meta.dirname, "..", "test", "fixtures");
  mkdirSync(out, { recursive: true });
  writeFileSync(path.join(out, `espn-${year}.json`), JSON.stringify(days));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
