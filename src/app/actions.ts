"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { redeemLoginLink, sendLoginLink } from "@/lib/auth";
import { displayName, hasLastName } from "@/lib/names";
import {
  createEntry,
  getCurrentSeason,
  getEntry,
  getSeason,
  getSeasonData,
  picksLocked,
  replacePicks,
} from "@/lib/data";
import { clearSession, getCurrentPerson, setSession } from "@/lib/session";

export type FormState = { error?: string; ok?: string; devLink?: string } | undefined;

const signInSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Enter your full name")
    .refine(hasLastName, "Enter your first and last name (standings show “Josh O”)"),
  email: z.email("Enter a valid email"),
});

/** Emails a one-time sign-in link. Nobody is signed in until they open it. */
export async function signIn(_: FormState, form: FormData): Promise<FormState> {
  const parsed = signInSchema.safeParse({ name: form.get("name"), email: form.get("email") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  try {
    const { devLink } = await sendLoginLink({ ...parsed.data, origin });
    return { ok: `Check ${parsed.data.email} for your sign-in link. It works for 30 minutes.`, devLink };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn't send the email" };
  }
}

/** Second step of sign-in, run by a button click so email link scanners can't use up the link. */
export async function finishSignIn(token: string): Promise<FormState> {
  const person = await redeemLoginLink(token);
  if (!person) return { error: "That link has expired or was already used. Request a new one." };
  await setSession(person.id);
  redirect("/picks");
}

export async function signOut() {
  await clearSession();
  redirect("/");
}

export async function newEntry(): Promise<FormState> {
  const person = await getCurrentPerson();
  if (!person) redirect("/signin");
  const season = await getCurrentSeason();
  if (!season || picksLocked(season)) return { error: "Picks are locked for this season." };
  // One entry per person, shown as first name + last initial.
  const { entries } = await getSeasonData(season.year);
  const existing = entries.find((e) => e.personId === person.id);
  if (existing) redirect(`/picks/${existing.entryId}`);
  const name = displayName(person.name, entries.map((e) => e.name));
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
