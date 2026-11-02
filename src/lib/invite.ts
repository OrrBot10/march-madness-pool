import { randomBytes, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { connection } from "next/server";
import { getDb } from "@/lib/db";
import { settings } from "@/lib/db/schema";

// The pool is invite-only: Josh emails one link (/join/<code>) to everyone. Opening it remembers the code
// in a cookie, and only visitors with that cookie can sign up or log in. Resetting the code locks out
// anyone who only has the old link (existing sessions stay signed in).

const KEY = "invite_code";
const COOKIE = "mmp_invite";

export async function getInviteCode(): Promise<string> {
  const db = await getDb();
  const [row] = await db.select().from(settings).where(eq(settings.key, KEY));
  if (row) return row.value;
  const code = randomBytes(9).toString("base64url");
  await db.insert(settings).values({ key: KEY, value: code }).onConflictDoNothing();
  const [saved] = await db.select().from(settings).where(eq(settings.key, KEY));
  return saved.value;
}

export async function resetInviteCode(): Promise<string> {
  const db = await getDb();
  const code = randomBytes(9).toString("base64url");
  await db.insert(settings).values({ key: KEY, value: code }).onConflictDoUpdate({ target: settings.key, set: { value: code } });
  return code;
}

function same(a: string, b: string) {
  return a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export async function isValidInvite(code: string): Promise<boolean> {
  return same(code, await getInviteCode());
}

/** Remembers that this browser came through the invite link. */
export async function rememberInvite(code: string) {
  (await cookies()).set(COOKIE, code, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function hasInvite(): Promise<boolean> {
  await connection(); // per-request only, like the session check
  const code = (await cookies()).get(COOKIE)?.value;
  return !!code && (await isValidInvite(code));
}

/** The full link to paste into the invite email. */
export async function inviteUrl(): Promise<string> {
  const h = await headers();
  const base = process.env.APP_URL ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  return `${base.replace(/\/$/, "")}/join/${await getInviteCode()}`;
}
