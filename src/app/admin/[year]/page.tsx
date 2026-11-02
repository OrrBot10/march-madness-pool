import { notFound } from "next/navigation";
import { Suspense } from "react";
import Loading from "@/app/loading";
import { effectiveWinner, getSeason, getSeasonData, type Game } from "@/lib/data";
import { GAMES_PER_ROUND } from "@/lib/espn";
import { ROUNDS } from "@/lib/pool/rules";
import { requireAdmin } from "@/lib/session";
import { AsOfForm, GameOverride, MakeActiveButton, SettingsForm, SyncButton } from "./controls";
import { SeasonHeader } from "./SeasonHeader";

export default function AdminSeasonPage({ params }: PageProps<"/admin/[year]">) {
  return (
    <Suspense fallback={<Loading />}>
      <AdminSeason params={params} />
    </Suspense>
  );
}

const ROUND_NAMES = ["First Four", ...ROUNDS.map((r) => r.name)];

async function AdminSeason({ params }: { params: Promise<{ year: string }> }) {
  await requireAdmin();
  const season = await getSeason(Number((await params).year));
  if (!season) notFound();
  const { games, completedRounds } = await getSeasonData(season.year);

  return (
    <div className="space-y-6">
      <SeasonHeader season={season} current="" />

      <section className="space-y-3 rounded-lg border border-line bg-surface p-4">
        <h2 className="font-semibold">Season settings</h2>
        <SettingsForm year={season.year} status={season.status} lockAt={season.lockAt.toISOString()} />
        {!season.active && <MakeActiveButton year={season.year} />}
      </section>

      {season.startDay && (
        <section className="space-y-3 rounded-lg border border-line bg-surface p-4">
          <h2 className="font-semibold">ESPN results</h2>
          <p className="text-sm text-muted">
            Results update automatically: whenever anyone opens the site during the tournament and results are more
            than two minutes old, it checks ESPN in the background. A round’s payouts post once every game in it is
            final.
          </p>
          <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-muted">Last checked</dt>
              <dd>{season.lastSyncAt?.toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" }) ?? "Never"}</dd>
            </div>
            <div>
              <dt className="text-muted">Payouts posted through</dt>
              <dd>{completedRounds ? ROUNDS[completedRounds - 1].name : "No rounds yet"}</dd>
            </div>
            {season.lastSyncError && (
              <div className="col-span-full text-loss">Last sync failed: {season.lastSyncError}</div>
            )}
          </dl>
          <SyncButton year={season.year} />
          <details className="rounded-md bg-chip p-3 text-sm">
            <summary className="cursor-pointer font-medium">Replay a past tournament (testing)</summary>
            <p className="mt-2 text-muted">
              Count only games played through a date, to see what the site looked like mid-tournament. Clear the date
              for a live season.
            </p>
            <div className="mt-2">
              <AsOfForm year={season.year} asOfDay={season.asOfDay} />
            </div>
          </details>
        </section>
      )}

      <section className="space-y-4">
        <h2 className="font-semibold">Games</h2>
        {games.length === 0 && <p className="text-sm text-muted">No games yet.</p>}
        {ROUND_NAMES.map((name, round) => {
          const list = games.filter((g) => g.round === round);
          if (list.length === 0) return null;
          const final = list.filter((g) => effectiveWinner(g)).length;
          return (
            <div key={round} className="overflow-x-auto rounded-lg border border-line bg-surface">
              <div className="flex items-baseline justify-between border-b border-line bg-chip px-4 py-2 text-sm">
                <span className="font-semibold">{name}</span>
                <span className="text-muted">
                  {final} of {round === 0 ? list.length : GAMES_PER_ROUND[round]} final
                </span>
              </div>
              <table className="w-full min-w-[640px] text-sm tabular">
                <tbody>
                  {list.map((g) => (
                    <GameRow key={g.espnId} game={g} year={season.year} />
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </section>
    </div>
  );
}

function GameRow({ game: g, year }: { game: Game; year: number }) {
  const winner = effectiveWinner(g);
  const side = (id: string | null, name: string, seed: number | null, score: number | null) => (
    <span className={winner && id === winner ? "font-semibold" : winner ? "text-muted" : ""}>
      {seed && <span className="text-muted">{seed} </span>}
      {name}
      {score !== null && g.state !== "pre" && <span className="ml-1">{score}</span>}
    </span>
  );
  return (
    <tr className="border-t border-line first:border-t-0">
      <td className="w-36 px-4 py-1.5 text-muted">
        {g.startAt.toLocaleString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit" })}
      </td>
      <td className="w-20 px-2 py-1.5 text-muted">{g.region ?? ""}</td>
      <td className="px-2 py-1.5">
        {side(g.aEspnId, g.aName, g.aSeed, g.aScore)} <span className="text-muted">vs</span>{" "}
        {side(g.bEspnId, g.bName, g.bSeed, g.bScore)}
      </td>
      <td className="px-2 py-1.5 text-muted">
        {g.overrideWinnerEspnId ? <span className="text-accent">Set by admin</span> : g.detail}
      </td>
      <td className="px-4 py-1.5 text-right">
        {g.round > 0 && (
          <GameOverride
            year={year}
            espnId={g.espnId}
            override={g.overrideWinnerEspnId}
            teams={[
              { id: g.aEspnId, label: g.aName },
              { id: g.bEspnId, label: g.bName },
            ]}
          />
        )}
      </td>
    </tr>
  );
}
