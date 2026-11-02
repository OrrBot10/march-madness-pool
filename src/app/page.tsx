import Link from "next/link";
import { CourtLines } from "@/components/CourtLines";
import { Stat } from "@/components/Stat";
import { SITE } from "@/lib/site";
import { getCurrentSeason, getSeasonData, picksLocked } from "@/lib/data";
import { money, pct } from "@/lib/format";
import { historyYears, loadHistoryYear } from "@/lib/history-data";
import { computePool } from "@/lib/pool/engine";

/** Before the first season is created (or between seasons): what the pool is, and last year's results. */
function OffSeason() {
  const lastYear = historyYears()[0];
  const last = lastYear ? loadHistoryYear(lastYear) : null;
  const result = last ? computePool(last) : null;
  const champ = last?.teams.find((t) => t.wins === 6);
  const top = result ? [...result.entries].sort((a, b) => b.net - a.net).slice(0, 3) : [];

  return (
    <div className="space-y-6">
      <section className="banner relative overflow-hidden rounded-xl p-6 text-white sm:p-8">
        <CourtLines className="text-white/[0.09]" />
        <div className="relative">
          <div className="display text-sm font-semibold uppercase tracking-widest text-sky">Off-season</div>
          <h1 className="mt-1 text-3xl sm:text-4xl">See you in March</h1>
          <p className="mt-2 max-w-2xl text-white/80">
            Picks open right after Selection Sunday. Watch for Josh’s invite email with your link to join.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/rules"
              className="display rounded-md bg-hardwood px-5 py-2 text-lg font-bold uppercase tracking-wide text-white hover:brightness-110"
            >
              How it works
            </Link>
            {lastYear && (
              <Link
                href={`/history/${lastYear}`}
                className="display rounded-md border border-white/40 px-5 py-2 text-lg font-bold uppercase tracking-wide text-white hover:bg-white/10"
              >
                {lastYear} results
              </Link>
            )}
          </div>
          <p className="mt-5 text-xs text-white/60">Hosted by {SITE.owner} since {SITE.since}.</p>
        </div>
      </section>

      {last && result && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label={`${last.year} entries`} value={String(last.entries.length)} />
          <Stat label={`${last.year} pot`} value={money(result.pot + result.feePot, { whole: true })} />
          <Stat label="Champion" value={champ?.name ?? "—"} sub={champ ? `${champ.seed} seed` : undefined} />
          <Stat label="Shares bought" value={String(result.totalShares)} />
        </div>
      )}

      {top.length > 0 && (
        <section className="rounded-lg border border-line bg-surface p-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg">{lastYear} top 3</h2>
            <Link href={`/history/${lastYear}`} className="text-sm text-accent hover:underline">
              Full standings →
            </Link>
          </div>
          <ol className="mt-3 grid gap-3 sm:grid-cols-3">
            {top.map((e, i) => (
              <li key={e.entryId} className="flex items-center gap-3 rounded-md bg-chip p-3">
                <span
                  className={`display grid h-10 w-10 shrink-0 place-items-center rounded-full text-lg font-extrabold text-white ${
                    ["bg-[#c9a227]", "bg-[#8a96a8]", "bg-[#b0703c]"][i]
                  }`}
                  aria-label={["1st", "2nd", "3rd"][i]}
                >
                  {i + 1}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{e.name}</span>
                  <span className="block text-sm text-gain tabular">
                    +{money(e.net)} <span className="text-muted">({pct(e.pctReturn)})</span>
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

export default async function Home() {
  const season = await getCurrentSeason();
  if (!season) return <OffSeason />;

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
