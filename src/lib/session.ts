import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { people } from "@/lib/db/schema";

const COOKIE = "mmp_session";

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (s) return s;
  if (process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET must be set in production");
  return "local-dev-secret";
}

function sign(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

export async function setSession(personId: number) {
  const value = String(personId);
  (await cookies()).set(COOKIE, `${value}.${sign(value)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 120,
  });
}

export async function clearSession() {
  (await cookies()).delete(COOKIE);
}

export async function getCurrentPerson() {
  // Per-request only: keeps runtime prefetches (which can see cookies) from touching the database.
  await connection();
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const [value, mac] = raw.split(".");
  const expected = sign(value);
  if (!mac || mac.length !== expected.length || !timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null;
  const db = await getDb();
  const [person] = await db.select().from(people).where(eq(people.id, Number(value)));
  return person ?? null;
}
