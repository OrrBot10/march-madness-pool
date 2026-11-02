"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/picks", label: "My Picks" },
  { href: "/entries", label: "All Picks" },
  { href: "/standings", label: "Standings" },
  { href: "/history", label: "History" },
  { href: "/rules", label: "Rules" },
];

function NavList({ path }: { path: string | null }) {
  const isActive = (href: string) => path !== null && (href === "/" ? path === "/" : path.startsWith(href));
  return (
    <nav className="relative mx-auto flex max-w-6xl gap-1 overflow-x-auto px-2 pb-1.5 text-sm">
      {NAV.map((n) => (
        <Link
          key={n.href}
          href={n.href}
          aria-current={isActive(n.href) ? "page" : undefined}
          className={`display shrink-0 rounded-md px-3 py-1.5 font-semibold uppercase tracking-wide ${
            isActive(n.href) ? "bg-white/15 text-white" : "text-white/75 hover:bg-white/10 hover:text-white"
          }`}
        >
          {n.label}
        </Link>
      ))}
    </nav>
  );
}

function ActiveNav() {
  return <NavList path={usePathname()} />;
}

/** The URL is request data, so the highlighted tab streams in; the plain links render immediately. */
export function NavLinks() {
  return (
    <Suspense fallback={<NavList path={null} />}>
      <ActiveNav />
    </Suspense>
  );
}
