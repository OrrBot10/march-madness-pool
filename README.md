# March Madness Investment Pool

Web app for Josh's annual NCAA tournament investment pool: players buy shares in teams, collect a dividend each round
their teams win, and lowest-seed bonuses are paid from the $10 entry fees. Rules live in `src/lib/pool/rules.ts`.

## Run it locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. The first load creates a local database in `.data/` with a demo 2027 season
(the 2026 bracket and entries, open for picks).

## Tests

```bash
npm test
```

`src/lib/pool/history.test.ts` replays every past year (2022–2026) through the scoring engine and checks each
entry against what the spreadsheet reported, to the cent.

## Re-import past years

```bash
npx tsx scripts/import-history.ts "C:\Users\joshr\OneDrive\Desktop\March Madness Investment Pool"
```

## Status

Built: scoring engine, history, sign-in (local only, no email check yet), pick entry, everyone's picks, standings.

Not built yet: emailed sign-in links, admin screens (payments, result overrides, lock time), ESPN bracket and score
import, round recap emails, hosting.
