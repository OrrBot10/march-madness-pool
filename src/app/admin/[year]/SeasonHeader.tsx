import Link from "next/link";
import type { Season } from "@/lib/data";

const TABS = [
  { href: "", label: "Results" },
  { href: "/bracket", label: "Bracket" },
  { href: "/entries", label: "Entries & payments" },
];

export function SeasonHeader({ season, current }: { season: Season; current: "" | "/bracket" | "/entries" }) {
  return (
    <div className="space-y-3">
      <Link href="/admin" className="text-sm text-muted hover:text-ink">
        ← Admin
      </Link>
      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="text-2xl font-bold">{season.year} season</h1>
        <span className="rounded bg-chip px-2 py-0.5 text-sm capitalize">{season.status}</span>
        {season.active && <span className="rounded bg-gain-bg px-2 py-0.5 text-sm text-gain">on site</span>}
      </div>
      <nav className="flex gap-1 border-b border-line text-sm">
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={`/admin/${season.year}${t.href}`}
            className={`-mb-px border-b-2 px-3 py-2 ${current === t.href ? "border-accent font-semibold" : "border-transparent text-muted hover:text-ink"}`}
          >
            {t.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
