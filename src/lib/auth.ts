import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { loginTokens, people } from "@/lib/db/schema";
import { SITE } from "@/lib/site";

const LINK_MINUTES = 30;
const MAX_LINKS_PER_15_MIN = 3;

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

export class TooManyRequests extends Error {}

/**
 * Creates a one-time sign-in link and emails it. Without an email service configured (local testing),
 * returns the link instead so it can be shown on screen.
 */
export async function sendLoginLink(opts: { name: string; email: string; origin: string }): Promise<{ devLink?: string }> {
  const db = await getDb();
  const email = opts.email.trim().toLowerCase();
  const recent = await db
    .select({ id: loginTokens.id })
    .from(loginTokens)
    .where(and(eq(loginTokens.email, email), gt(loginTokens.createdAt, new Date(Date.now() - 15 * 60 * 1000))));
  if (recent.length >= MAX_LINKS_PER_15_MIN) throw new TooManyRequests("Too many sign-in emails. Try again in 15 minutes.");

  const token = randomBytes(32).toString("base64url");
  await db.insert(loginTokens).values({
    tokenHash: hash(token),
    email,
    name: opts.name.trim().replace(/\s+/g, " "),
    expiresAt: new Date(Date.now() + LINK_MINUTES * 60 * 1000),
  });
  const base = process.env.APP_URL ?? opts.origin;
  const link = `${base.replace(/\/$/, "")}/auth/verify?token=${token}`;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    if (process.env.NODE_ENV === "production") throw new Error("Email isn't set up (RESEND_API_KEY is missing)");
    return { devLink: link };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? `Josh Orr's Pool <onboarding@resend.dev>`,
      to: [email],
      subject: `Your sign-in link for ${SITE.name}`,
      text: `Click to sign in to ${SITE.name}:\n\n${link}\n\nThe link works once and expires in ${LINK_MINUTES} minutes. If you didn't ask for it, ignore this email.`,
      html: loginEmailHtml(link),
    }),
  });
  if (!res.ok) throw new Error(`Couldn't send the email (${res.status}). Try again in a minute.`);
  return {};
}

function loginEmailHtml(link: string) {
  return `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#0a1b33">
  <div style="background:#0a2240;color:#fff;padding:18px 20px;border-radius:8px 8px 0 0">
    <div style="font-size:20px;font-weight:800;letter-spacing:.5px">${SITE.titleLead.toUpperCase()}</div>
    <div style="font-size:14px;font-weight:700;color:#4cc3f2">${SITE.titleRest.toUpperCase()}</div>
  </div>
  <div style="border:1px solid #dde3ec;border-top:0;padding:20px;border-radius:0 0 8px 8px">
    <p>Click below to sign in and make your picks.</p>
    <p><a href="${link}" style="display:inline-block;background:#f26b1d;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:bold">Sign in</a></p>
    <p style="font-size:12px;color:#56627a">The link works once and expires in ${LINK_MINUTES} minutes. If you didn't ask for it, you can ignore this email.</p>
  </div>
</div>`;
}

/** Uses up a sign-in link and returns the person it signs in, creating them on first sign-in. */
export async function redeemLoginLink(token: string) {
  const db = await getDb();
  const [row] = await db
    .update(loginTokens)
    .set({ usedAt: new Date() })
    .where(and(eq(loginTokens.tokenHash, hash(token)), isNull(loginTokens.usedAt), gt(loginTokens.expiresAt, new Date())))
    .returning();
  if (!row) return null;

  const [existing] = await db.select().from(people).where(eq(people.email, row.email));
  if (existing) {
    if (existing.name !== row.name) await db.update(people).set({ name: row.name }).where(eq(people.id, existing.id));
    return { ...existing, name: row.name };
  }
  const [created] = await db.insert(people).values({ name: row.name, email: row.email }).returning();
  return created;
}
