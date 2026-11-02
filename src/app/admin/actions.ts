"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createEntry, findOrCreatePerson, getSeason } from "@/lib/data";
import { getDb } from "@/lib/db";
import { displayName } from "@/lib/names";
import { entries, picks, seasons, teams } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/session";
import { clearSyncedDays, createSeasonFromEspn, refreshBracket, setOverride, syncSeason } from "@/lib/sync";

export type AdminState = { error?: string; ok?: string } | undefined;

function message(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

function refresh(year?: number) {
  revalidatePath("/", "layout");
  if (year) revalidatePath(`/admin/${year}`, "layout");
}

const newSeasonSchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick the First Four start date"),
});

export async function createSeason(_: AdminState, form: FormData): Promise<AdminState> {
  await requireAdmin();
  const parsed = newSeasonSchema.safeParse({ year: form.get("year"), startDate: form.get("startDate") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  try {
    await createSeasonFromEspn(parsed.data.year, parsed.data.startDate.replaceAll("-", ""));
  } catch (err) {
    return { error: `Couldn't build the bracket from ESPN: ${message(err)}` };
  }
  redirect(`/admin/${parsed.data.year}/bracket`);
}

const settingsSchema = z.object({
  status: z.enum(["setup", "open", "locked", "complete"]),
  lockAt: z.iso.datetime(),
});

export async function updateSettings(year: number, _: AdminState, form: FormData): Promise<AdminState> {
  await requireAdmin();
  const parsed = settingsSchema.safeParse({ status: form.get("status"), lockAt: form.get("lockAt") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const db = await getDb();
  await db
    .update(seasons)
    .set({ status: parsed.data.status, lockAt: new Date(parsed.data.lockAt) })
    .where(eq(seasons.year, year));
  refresh(year);
  return { ok: "Saved" };
}

export async function makeActive(year: number) {
  await requireAdmin();
  const db = await getDb();
  await db.transaction(async (tx) => {
    await tx.update(seasons).set({ active: false }).where(ne(seasons.year, year));
    await tx.update(seasons).set({ active: true }).where(eq(seasons.year, year));
  });
  refresh(year);
}

export async function syncNow(year: number): Promise<AdminState> {
  await requireAdmin();
  try {
    await syncSeason(year);
  } catch (err) {
    refresh(year);
    return { error: `ESPN sync failed: ${message(err)}` };
  }
  refresh(year);
  return { ok: "Results updated from ESPN" };
}

export async function setAsOfDay(year: number, _: AdminState, form: FormData): Promise<AdminState> {
  await requireAdmin();
  const raw = String(form.get("asOf") ?? "");
  const day = raw ? raw.replaceAll("-", "") : null;
  if (day && !/^\d{8}$/.test(day)) return { error: "Pick a date" };
  const db = await getDb();
  await db.update(seasons).set({ asOfDay: day }).where(eq(seasons.year, year));
  await clearSyncedDays(year);
  return syncNow(year);
}

export async function overrideWinner(year: number, espnId: string, winnerEspnId: string | null): Promise<AdminState> {
  await requireAdmin();
  await setOverride(year, espnId, winnerEspnId);
  refresh(year);
  return { ok: winnerEspnId ? "Winner set" : "Using ESPN's result" };
}

export async function renameTeams(year: number, _: AdminState, form: FormData): Promise<AdminState> {
  await requireAdmin();
  const db = await getDb();
  for (const [key, value] of form.entries()) {
    if (!key.startsWith("name:")) continue;
    const name = String(value).trim();
    if (!name) return { error: "Team names can't be blank" };
    await db
      .update(teams)
      .set({ name })
      .where(and(eq(teams.year, year), eq(teams.id, key.slice(5))));
  }
  refresh(year);
  return { ok: "Names saved" };
}

export async function reloadBracket(year: number): Promise<AdminState> {
  await requireAdmin();
  try {
    await refreshBracket(year);
  } catch (err) {
    return { error: message(err) };
  }
  refresh(year);
  return { ok: "Bracket re-checked against ESPN" };
}

export async function setPaid(entryId: number, paid: boolean) {
  await requireAdmin();
  const db = await getDb();
  const [row] = await db.update(entries).set({ paid }).where(eq(entries.id, entryId)).returning();
  refresh(row?.year);
}

const addEntrySchema = z.object({
  name: z.string().trim().min(2, "Enter their full name"),
  email: z.union([z.literal(""), z.email("Enter a valid email or leave it blank")]),
});

export async function addEntry(year: number, _: AdminState, form: FormData): Promise<AdminState> {
  await requireAdmin();
  if (!(await getSeason(year))) return { error: "No such season" };
  const parsed = addEntrySchema.safeParse({ name: form.get("name"), email: form.get("email") ?? "" });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const person = parsed.data.email ? await findOrCreatePerson(parsed.data.name, parsed.data.email) : null;
  if (person) {
    const db = await getDb();
    const [existing] = await db
      .select()
      .from(entries)
      .where(and(eq(entries.year, year), eq(entries.personId, person.id)));
    if (existing) return { error: `${parsed.data.email} already has an entry (${existing.name}). One per person.` };
  }
  const db = await getDb();
  const taken = (await db.select({ name: entries.name }).from(entries).where(eq(entries.year, year))).map((e) => e.name);
  const entry = await createEntry(year, person?.id ?? null, displayName(parsed.data.name, taken));
  redirect(`/picks/${entry.id}`);
}

export async function deleteEntry(entryId: number) {
  await requireAdmin();
  const db = await getDb();
  const [row] = await db.delete(entries).where(eq(entries.id, entryId)).returning();
  await db.delete(picks).where(eq(picks.entryId, entryId));
  refresh(row?.year);
}
