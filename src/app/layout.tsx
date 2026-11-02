import type { Metadata } from "next";
import { Roboto, Roboto_Condensed } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";
import { CourtLines } from "@/components/CourtLines";
import { BallMark } from "@/components/Logo";
import { NavLinks } from "@/components/NavLinks";
import { getCurrentPerson } from "@/lib/session";
import { SITE } from "@/lib/site";
import { signOut } from "./actions";
import "./globals.css";

const roboto = Roboto({ variable: "--font-roboto", subsets: ["latin"], weight: ["400", "500", "700"] });
const robotoCondensed = Roboto_Condensed({
  variable: "--font-roboto-condensed",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  title: { default: SITE.name, template: `%s · ${SITE.name}` },
  description: SITE.tagline,
};

async function Account() {
  const person = await getCurrentPerson();
  if (!person) {
    return (
      <Link href="/signin" className="rounded-md bg-white px-3 py-1.5 text-sm font-bold text-navy hover:bg-sky">
        Sign in
      </Link>
    );
  }
  return (
    <form action={signOut} className="flex items-center gap-2 text-sm">
      {person.isAdmin && (
        <Link href="/admin" className="rounded-md bg-white/10 px-2.5 py-1 font-medium text-white hover:bg-white/20">
          Admin
        </Link>
      )}
      <span className="hidden text-white/80 sm:inline">{person.name}</span>
      <button className="rounded-md border border-white/30 px-2.5 py-1 text-white/90 hover:bg-white/10">Sign out</button>
    </form>
  );
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${roboto.variable} ${robotoCondensed.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <header className="banner relative overflow-hidden text-white">
          <CourtLines className="text-white/[0.07]" />
          <div className="relative mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 pt-3 pb-2">
            <Link href="/" className="flex items-center gap-2.5">
              <BallMark className="h-9 w-9 shrink-0" />
              <span className="display text-lg leading-tight font-extrabold uppercase tracking-wide sm:text-xl">
                {SITE.titleLead} <span className="text-sky">{SITE.titleRest}</span>
              </span>
            </Link>
            <Suspense fallback={<span className="h-8 w-16" />}>
              <Account />
            </Suspense>
          </div>
          <NavLinks />
          <div aria-hidden className="relative h-1 bg-gradient-to-r from-sky via-accent to-hardwood" />
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
        <footer className="border-t border-line">
          <div className="mx-auto max-w-6xl space-y-1 px-4 py-6 text-xs text-muted">
            <p>
              A private pool run by <strong className="text-ink">{SITE.owner}</strong> since {SITE.since}. Questions? Ask
              Josh.
            </p>
            <p>
              Settle up via Venmo {SITE.venmo} or PayPal {SITE.paypal}. Not affiliated with the NCAA.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
