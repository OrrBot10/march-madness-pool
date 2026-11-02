import { desc, eq, inArray } from "drizzle-orm";
import { connection } from "next/server";
import { getDb } from "@/lib/db";
import { entries, people, picks, seasons, teams } from "@/lib/db/schema";
import type { Entry, Team } from "@/lib/pool/engine";
import type { Region } from "@/lib/pool/rules";

export type Season = typeof seasons.$inferSelect;

export interface SeasonEntry extends Entry {
  entryId: number;
  personId: number | null;
  paid: boolean;
  updatedAt: Date;
}

export async function getCurrentSeason(): Promise<Season | null> {
  // Picks and results change constantly; never bake them into the prerendered shell.
  await connection();
  const db = await getDb();
  const [season] = await db.select().from(seasons).orderBy(desc(seasons.year)).limit(1);
  return season ?? null;
}

export function picksLocked(season: Season, now = new Date()): boolean {
  return season.status !== "open" || now >= season.lockAt;
}

export async function getSeasonData(year: number) {
  const db = await getDb();
  const teamRows = await db.select().from(teams).where(eq(teams.year, year));
  const entryRows = await db.select().from(entries).where(eq(entries.year, year)).orderBy(entries.id);
  const pickRows = entryRows.length
    ? await db.select().from(picks).where(inArray(picks.entryId, entryRows.map((e) => e.id)))
    : [];

  const picksByEntry = new Map<number, Record<string, number>>();
  for (const p of pickRows) {
    const m = picksByEntry.get(p.entryId) ?? {};
    m[p.teamId] = p.shares;
    picksByEntry.set(p.entryId, m);
  }

  const teamList: Team[] = teamRows.map((t) => ({ ...t, region: t.region as Region }));
  const entryList: SeasonEntry[] = entryRows.map((e) => ({
    id: String(e.id),
    entryId: e.id,
    name: e.name,
    entryFee: e.entryFee,
    personId: e.personId,
    paid: e.paid,
    updatedAt: e.updatedAt,
    picks: picksByEntry.get(e.id) ?? {},
  }));
  return { teams: teamList, entries: entryList };
}

export async function findOrCreatePerson(name: string, email: string) {
  const db = await getDb();
  const normalized = email.trim().toLowerCase();
  const [found] = await db.select().from(people).where(eq(people.email, normalized));
  if (found) return found;
  const admins = (process.env.ADMIN_EMAILS ?? "joshrorr@hotmail.com").toLowerCase().split(",");
  const [created] = await db
    .insert(people)
    .values({ name: name.trim(), email: normalized, isAdmin: admins.includes(normalized) })
    .returning();
  return created;
}

export async function createEntry(year: number, personId: number, name: string) {
  const db = await getDb();
  const [row] = await db.insert(entries).values({ year, personId, name: name.trim() }).returning();
  return row;
}

export async function getEntry(entryId: number) {
  const db = await getDb();
  const [row] = await db.select().from(entries).where(eq(entries.id, entryId));
  return row ?? null;
}

/** Replaces an entry's picks. Callers must check ownership and the lock first. */
export async function replacePicks(entryId: number, shares: Record<string, number>) {
  const db = await getDb();
  await db.transaction(async (tx) => {
    await tx.delete(picks).where(eq(picks.entryId, entryId));
    const rows = Object.entries(shares)
      .filter(([, n]) => n > 0)
      .map(([teamId, n]) => ({ entryId, teamId, shares: n }));
    if (rows.length) await tx.insert(picks).values(rows);
    await tx.update(entries).set({ updatedAt: new Date() }).where(eq(entries.id, entryId));
  });
}
