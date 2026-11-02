import { boolean, integer, pgTable, primaryKey, serial, text, timestamp } from "drizzle-orm/pg-core";

export const seasons = pgTable("seasons", {
  year: integer("year").primaryKey(),
  /** setup: bracket not published; open: taking picks; locked: games under way; complete: settled */
  status: text("status", { enum: ["setup", "open", "locked", "complete"] }).notNull(),
  /** Tip-off of the first Round of 64 game. Picks lock at this time. */
  lockAt: timestamp("lock_at", { withTimezone: true }).notNull(),
  completedRounds: integer("completed_rounds").notNull().default(0),
});

export const teams = pgTable(
  "teams",
  {
    year: integer("year").notNull(),
    id: text("id").notNull(),
    region: text("region").notNull(),
    seed: integer("seed").notNull(),
    name: text("name").notNull(),
    wins: integer("wins").notNull().default(0),
    eliminated: boolean("eliminated").notNull().default(false),
  },
  (t) => [primaryKey({ columns: [t.year, t.id] })],
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
  /** Null for entries imported from spreadsheets. */
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

/** Kept in sync with the tables above; run on startup until we move to drizzle-kit migrations. */
export const BOOTSTRAP_SQL = `
create table if not exists seasons (
  year integer primary key,
  status text not null,
  lock_at timestamptz not null,
  completed_rounds integer not null default 0
);
create table if not exists teams (
  year integer not null,
  id text not null,
  region text not null,
  seed integer not null,
  name text not null,
  wins integer not null default 0,
  eliminated boolean not null default false,
  primary key (year, id)
);
create table if not exists people (
  id serial primary key,
  name text not null,
  email text unique,
  is_admin boolean not null default false
);
create table if not exists entries (
  id serial primary key,
  year integer not null,
  person_id integer,
  name text not null,
  entry_fee integer not null default 10,
  paid boolean not null default false,
  updated_at timestamptz not null default now()
);
create table if not exists picks (
  entry_id integer not null,
  team_id text not null,
  shares integer not null,
  primary key (entry_id, team_id)
);
`;
