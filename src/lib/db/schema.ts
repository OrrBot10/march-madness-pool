import { boolean, integer, pgTable, primaryKey, serial, text, timestamp } from "drizzle-orm/pg-core";

// Change these tables, then run `npm run db:generate` to write a migration into drizzle/.

export const seasons = pgTable("seasons", {
  year: integer("year").primaryKey(),
  /** setup: bracket not published; open: taking picks; locked: games under way; complete: settled */
  status: text("status", { enum: ["setup", "open", "locked", "complete"] }).notNull(),
  /** The season the site shows. Exactly one should be active. */
  active: boolean("active").notNull().default(false),
  /** Tip-off of the first Round of 64 game. Picks lock at this time. */
  lockAt: timestamp("lock_at", { withTimezone: true }).notNull(),
  /** First day of the tournament (First Four), YYYYMMDD Eastern. Null for seasons not tied to ESPN. */
  startDay: text("start_day"),
  /** For testing with a past tournament: only use games played on or before this day (YYYYMMDD). */
  asOfDay: text("as_of_day"),
  /** Days already fetched after they ended with every game final; never fetched again. */
  syncedDays: text("synced_days").array().notNull().default([]),
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  lastSyncError: text("last_sync_error"),
});

/** The 64 pool slots. A First Four pair is one slot with two ESPN ids. */
export const teams = pgTable(
  "teams",
  {
    year: integer("year").notNull(),
    id: text("id").notNull(), // "<region>-<seed>", e.g. "midwest-11"
    region: text("region").notNull(),
    seed: integer("seed").notNull(),
    name: text("name").notNull(),
    espnIds: text("espn_ids").array().notNull().default([]),
  },
  (t) => [primaryKey({ columns: [t.year, t.id] })],
);

/** Tournament games as ESPN reports them. Wins and payouts are derived from these. */
export const games = pgTable(
  "games",
  {
    year: integer("year").notNull(),
    espnId: text("espn_id").notNull(),
    round: integer("round").notNull(), // 0 First Four, 1 Round of 64 … 6 championship
    region: text("region"),
    startAt: timestamp("start_at", { withTimezone: true }).notNull(),
    state: text("state", { enum: ["pre", "in", "post"] }).notNull(),
    detail: text("detail").notNull().default(""),
    aEspnId: text("a_espn_id"),
    aName: text("a_name").notNull(),
    aSeed: integer("a_seed"),
    aScore: integer("a_score"),
    bEspnId: text("b_espn_id"),
    bName: text("b_name").notNull(),
    bSeed: integer("b_seed"),
    bScore: integer("b_score"),
    /** ESPN's winner, once final. */
    winnerEspnId: text("winner_espn_id"),
    /** Set by the admin to fix or fill in a result; wins over ESPN and survives syncs. */
    overrideWinnerEspnId: text("override_winner_espn_id"),
  },
  (t) => [primaryKey({ columns: [t.year, t.espnId] })],
);

export const people = pgTable("people", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").unique(),
  isAdmin: boolean("is_admin").notNull().default(false),
});

export const entries = pgTable("entries", {
  id: serial("id").primaryKey(),
  year: integer("year").notNull(),
  /** Null for entries imported from spreadsheets or added by the admin for someone without a login. */
  personId: integer("person_id"),
  name: text("name").notNull(),
  entryFee: integer("entry_fee").notNull().default(10),
  paid: boolean("paid").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const picks = pgTable(
  "picks",
  {
    entryId: integer("entry_id").notNull(),
    teamId: text("team_id").notNull(),
    shares: integer("shares").notNull(),
  },
  (t) => [primaryKey({ columns: [t.entryId, t.teamId] })],
);
