"use server";

import { timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { people } from "@/lib/db/schema";
import { hasInvite } from "@/lib/invite";
import { displayName, hasLastName } from "@/lib/names";
import {
  adminEmails,
  createEntry,
  getCurrentSeason,
  getEntry,
  getSeason,
  getSeasonData,
  picksLocked,
  replacePicks,
} from "@/lib/data";
import { clearSession, getCurrentPerson, setSession } from "@/lib/session";

export type FormState = { error?: string; ok?: string } | undefined;

export type SignInState =
  | { step: "email" | "name" | "password"; email?: string; name?: string; error?: string }
  | undefined;

const emailSchema = z.email("Enter a valid email");
const nameSchema = z
  .string()
  .trim()
  .min(3, "Enter your full name")
  .refine(hasLastName, "Enter your first and last name (standings show “Josh O”)");

function adminPasswordMatches(given: string): boolean {
  const expected =
    process.env.ADMIN_PASSWORD ?? (process.env.NODE_ENV === "production" ? undefined : "local-admin");
  if (!expected) return false; // no admin password set in production: admin sign-in stays closed
  return given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

/**
 * Invite-only sign-in by email. Returning players just enter their email; new players also give their full name.
 * Admin emails must also give ADMIN_PASSWORD, since anyone with the invite link could type Josh's email.
 */
export async function signIn(_: SignInState, form: FormData): Promise<SignInState> {
  const parsedEmail = emailSchema.safeParse(String(form.get("email") ?? "").trim().toLowerCase());
  if (!parsedEmail.success) return { step: "email", error: parsedEmail.error.issues[0].message };
  const email = parsedEmail.data;
  // Admins (who also need the password below) can sign in without the invite link, e.g. to get it the first time.
  if (!adminEmails().includes(email) && !(await hasInvite())) {
    return { step: "email", error: "Open the invite link from Josh’s email first." };
  }
  const name = String(form.get("name") ?? "").trim();
  const password = String(form.get("password") ?? "");

  const db = await getDb();
  let [person] = await db.select().from(people).where(eq(people.email, email));

  if (!person) {
    if (!name) return { step: "name", email };
    const parsedName = nameSchema.safeParse(name);
    if (!parsedName.success) return { step: "name", email, name, error: parsedName.error.issues[0].message };
  }

  if (adminEmails().includes(email)) {
    if (!password) return { step: "password", email, name };
    if (!adminPasswordMatches(password)) return { step: "password", email, name, error: "That password isn’t right." };
  }

  if (!person) {
    [person] = await db.insert(people).values({ name: name.replace(/\s+/g, " "), email }).returning();
  }
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
