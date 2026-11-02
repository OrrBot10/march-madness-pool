# March Madness Investment Pool

Web app for Josh's annual NCAA tournament investment pool: players buy shares in teams, collect a dividend each round
their teams win, and lowest-seed bonuses are paid from the $10 entry fees. Rules live in `src/lib/pool/rules.ts`.

## Run it locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. The first load creates a local database in `.data/` with two test seasons:

- **2027 demo** (on the site): the 2026 bracket and entries, open for picks.
- **2026 replay**: the real 2026 tournament from saved ESPN data with the real entries. In Admin → 2026 →
  "Replay a past tournament", pick a date to see the site as it was that day.

Copy `.env.example` to `.env.local`. Delete `.data/` to start over.

## Sign-in

Invite-only, no passwords for players. Josh emails one link (`/join/<code>`, shown in Admin with copy/reset
buttons). Opening it lets that browser sign up (email + full name) or log back in (email only). Public pages
show "First L". Emails in `ADMIN_EMAILS` also need `ADMIN_PASSWORD` (locally `local-admin`), and can sign in
without the link via "Organizer sign-in".

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

## ESPN

`src/lib/espn.ts` reads ESPN's public scoreboard, one request per tournament day. After Selection Sunday, Admin →
"Start a new season" builds the 64-slot bracket from the First Four and Round of 64 games. During the tournament,
any page view syncs results in the background once they are five minutes old; `/api/cron/sync` (with
`Authorization: Bearer $CRON_SECRET`) does the same for a scheduler. A round pays out once all its games are final.
An admin can override any game's winner.

Refresh the test fixture with `npx tsx scripts/fetch-espn-fixture.ts 2026 20260317 20260407`.

## Database changes

Edit `src/lib/db/schema.ts`, then `npm run db:generate`. Migrations in `drizzle/` run on startup.

## Status

Built: scoring engine, history, invite-link sign-in, one entry per person with a running total,
everyone's picks, standings, admin (season setup from ESPN, bracket names, lock time, results and overrides,
entries and payments), ESPN results sync.

Not built yet: round recap drafts. Hosting: see DEPLOY.md.
