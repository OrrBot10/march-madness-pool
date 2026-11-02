import Link from "next/link";
import { CourtLines } from "@/components/CourtLines";
import { Stat } from "@/components/Stat";
import { SITE } from "@/lib/site";
import { getCurrentSeason, getSeasonData, picksLocked } from "@/lib/data";
import { money } from "@/lib/format";
import { computePool } from "@/lib/pool/engine";

export default async function Home() {
  const season = await getCurrentSeason();
  if (!season) return <p>The next pool hasn’t been set up yet. Check back after Selection Sunday.</p>;

  const { teams, entries, completedRounds } = await getSeasonData(season.year);
  const result = computePool({ teams, entries, completedRounds });
  const locked = picksLocked(season);
  const top = teams
    .map((t) => ({ ...t, shares: result.sharesByTeam[t.id] }))
    .filter((t) => t.shares > 0)
    .sort((a, b) => b.shares - a.shares)
    .slice(0, 10);
  const maxShares = top[0]?.shares ?? 1;
  const spends = result.entries.filter((e) => e.spent > 0).map((e) => e.spent + e.entryFee);

  return (
    <div className="space-y-6">
      <section className="banner relative overflow-hidden rounded-xl p-6 text-white sm:p-8">
        <CourtLines className="text-white/[0.09]" />
        <div className="relative">
        <div className="display text-sm font-semibold uppercase tracking-widest text-sky">
          {season.year} pool
        </div>
        <h1 className="mt-1 text-3xl sm:text-4xl">
          {locked ? "Picks are locked. Enjoy the games!" : "Picks are open"}
        </h1>
        <p className="mt-2 max-w-2xl text-white/80">
          {locked
            ? "Dividends post as soon as each round finishes."
            : `Buy shares in any team until tip-off of the first Round of 64 game: ${season.lockAt.toLocaleString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
                timeZoneName: "short",
              })}.`}
        </p>
        {!locked && (
          <Link
            href="/picks"
            className="display mt-5 inline-block rounded-md bg-hardwood px-6 py-2.5 text-lg font-bold uppercase tracking-wide text-white hover:brightness-110"
          >
            Make your picks
          </Link>
        )}
        <p className="mt-5 text-xs text-white/60">Hosted by {SITE.owner} since {SITE.since}.</p>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Entries" value={String(entries.length)} />
        <Stat label="Shares bought" value={String(result.totalShares)} />
        <Stat
          label="Total pot"
          value={money(result.pot + result.feePot, { whole: true })}
          sub={`${money(result.pot, { whole: true })} shares + ${money(result.feePot, { whole: true })} bonus fees`}
        />
        <Stat
          label="Entry range"
          value={spends.length ? `${money(Math.min(...spends), { whole: true })}–${money(Math.max(...spends), { whole: true })}` : "—"}
        />
      </div>

      <section className="rounded-lg border border-line bg-surface p-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-semibold">Most popular teams</h2>
          <Link href="/entries" className="text-sm text-accent hover:underline">
            See everyone’s picks →
          </Link>
        </div>
        <ul className="mt-3 space-y-1.5">
          {top.map((t) => (
            <li key={t.id} className="grid grid-cols-[minmax(0,10rem)_1fr_2.5rem] items-center gap-3 text-sm">
              <span className="truncate">
                <span className="text-muted tabular">{t.seed}</span> {t.name}
              </span>
              <span className="h-3 rounded-sm bg-accent/80" style={{ width: `${(t.shares / maxShares) * 100}%` }} />
              <span className="text-right font-semibold tabular">{t.shares}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
