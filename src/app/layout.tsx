import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";
import { getCurrentPerson } from "@/lib/session";
import { signOut } from "./actions";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "March Madness Investment Pool",
  description: "Buy shares in tournament teams and collect dividends every round they win.",
};

const NAV = [
  { href: "/", label: "Home" },
  { href: "/picks", label: "My Picks" },
  { href: "/entries", label: "All Picks" },
  { href: "/standings", label: "Standings" },
  { href: "/history", label: "History" },
  { href: "/rules", label: "Rules" },
];

async function Account() {
  const person = await getCurrentPerson();
  if (!person) {
    return (
      <Link href="/signin" className="rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-accent-ink">
        Sign in
      </Link>
    );
  }
  return (
    <form action={signOut} className="flex items-center gap-2 text-sm">
      <span className="hidden text-white/80 sm:inline">{person.name}</span>
      <button className="rounded-md border border-white/30 px-2.5 py-1 text-white/90 hover:bg-white/10">Sign out</button>
    </form>
  );
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <header className="bg-navy text-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
            <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
              <span aria-hidden className="grid h-7 w-7 place-items-center rounded-full bg-accent text-sm text-accent-ink">
                $
              </span>
              <span>
                March Madness <span className="text-accent">Investment Pool</span>
              </span>
            </Link>
            <Suspense fallback={<span className="h-8 w-16" />}>
              <Account />
            </Suspense>
          </div>
          <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-2 pb-2 text-sm">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="shrink-0 rounded-md px-3 py-1.5 text-white/85 hover:bg-white/10">
                {n.label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
        <footer className="mx-auto w-full max-w-6xl px-4 py-6 text-xs text-muted">
          Questions? Ask Josh. Settle up via Venmo @Josh-Orr-20 or PayPal joshrorr@hotmail.com.
        </footer>
      </body>
    </html>
  );
}
