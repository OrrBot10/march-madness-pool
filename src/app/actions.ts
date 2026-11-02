"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createEntry,
  findOrCreatePerson,
  getCurrentSeason,
  getEntry,
  getSeason,
  getSeasonData,
  picksLocked,
  replacePicks,
} from "@/lib/data";
import { clearSession, getCurrentPerson, setSession } from "@/lib/session";

export type FormState = { error?: string; ok?: string } | undefined;

const signInSchema = z.object({
  name: z.string().trim().min(2, "Enter your name, e.g. Josh O"),
  email: z.email("Enter a valid email"),
});

// TEMPORARY: signs in on name + email with no verification. To be replaced by emailed sign-in links
// before this goes anywhere but a local machine.
export async function signIn(_: FormState, form: FormData): Promise<FormState> {
  const parsed = signInSchema.safeParse({ name: form.get("name"), email: form.get("email") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const person = await findOrCreatePerson(parsed.data.name, parsed.data.email);
  await setSession(person.id);
  redirect("/picks");
}

export async function signOut() {
  await clearSession();
  redirect("/");
}

export async function newEntry(_: FormState, form: FormData): Promise<FormState> {
  const person = await getCurrentPerson();
  if (!person) redirect("/signin");
  const season = await getCurrentSeason();
  if (!season || picksLocked(season)) return { error: "Picks are locked for this season." };
  // One entry per person.
  const existing = (await getSeasonData(season.year)).entries.find((e) => e.personId === person.id);
  if (existing) redirect(`/picks/${existing.entryId}`);
  const name = String(form.get("name") ?? "").trim() || person.name;
  const entry = await createEntry(season.year, person.id, name);
  redirect(`/picks/${entry.id}`);
}

const picksSchema = z.record(z.string(), z.number().int().min(0).max(500));

export async function savePicks(entryId: number, shares: Record<string, number>): Promise<FormState> {
  const person = await getCurrentPerson();
  if (!person) return { error: "Your session expired. Sign in again." };
  const entry = await getEntry(entryId);
  if (!entry || (entry.personId !== person.id && !person.isAdmin)) return { error: "That entry isn't yours." };
  const season = await getSeason(entry.year);
  if (!season) return { error: "That entry's season no longer exists." };
  if (picksLocked(season) && !person.isAdmin) return { error: "Picks locked at tip-off." };

  const parsed = picksSchema.safeParse(shares);
  if (!parsed.success) return { error: "Shares must be whole numbers from 0 to 500." };
  const { teams } = await getSeasonData(season.year);
  const valid = new Set(teams.map((t) => t.id));
  if (Object.keys(parsed.data).some((id) => !valid.has(id))) return { error: "Unknown team in picks." };

  await replacePicks(entryId, parsed.data);
  revalidatePath("/", "layout");
  return { ok: `Saved at ${new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}` };
}
