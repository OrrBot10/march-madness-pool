import { getCurrentSeason, getSeasonData } from "@/lib/data";
import { money } from "@/lib/format";
import { REGIONS, priceForSeed } from "@/lib/pool/rules";
import { computePool } from "@/lib/pool/engine";

export default async function AllPicksPage() {
  const season = await getCurrentSeason();
  if (!season) return <p>No season yet.</p>;
  const { teams, entries, completedRounds } = await getSeasonData(season.year);
  const result = computePool({ teams, entries, completedRounds });
  const teamById = new Map(teams.map((t) => [t.id, t]));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Everyone’s picks · {season.year}</h1>
        <p className="mt-1 text-sm text-muted">Picks can change until tip-off, so check back.</p>
      </div>

      <section>
        <h2 className="mb-2 font-semibold">By team</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {REGIONS.map((region) => (
            <div key={region} className="overflow-hidden rounded-lg border border-line bg-surface">
              <h3 className="border-b border-line bg-chip px-4 py-2 text-sm font-semibold uppercase tracking-wide">
                {region}
              </h3>
              <ul className="divide-y divide-line text-sm">
                {teams
                  .filter((t) => t.region === region)
                  .sort((a, b) => a.seed - b.seed)
                  .map((t) => {
                    const owners = entries
                      .filter((e) => e.picks[t.id])
                      .map((e) => (e.picks[t.id] > 1 ? `${e.name} (${e.picks[t.id]})` : e.name));
                    return (
                      <li key={t.id} className="grid grid-cols-[1.5rem_1fr_auto] gap-2 px-4 py-1.5">
                        <span className="text-muted tabular">{t.seed}</span>
                        <span>
                          <span className="font-medium">{t.name}</span>
                          {owners.length > 0 && <span className="block text-xs text-muted">{owners.join(", ")}</span>}
                        </span>
                        <span className="font-semibold tabular">{result.sharesByTeam[t.id] || ""}</span>
                      </li>
                    );
                  })}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 font-semibold">By entry</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[...entries]
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((e) => {
              const picks = Object.entries(e.picks)
                .map(([id, n]) => ({ team: teamById.get(id)!, n }))
                .sort((a, b) => a.team.seed - b.team.seed || b.n - a.n);
              const cost = picks.reduce((s, p) => s + p.n * priceForSeed(p.team.seed), 0);
              return (
                <div key={e.entryId} className="rounded-lg border border-line bg-surface p-3">
                  <div className="flex items-baseline justify-between">
                    <span className="font-semibold">{e.name}</span>
                    <span className="text-sm text-muted tabular">{money(cost, { whole: true })}</span>
                  </div>
                  <ul className="mt-2 flex flex-wrap gap-1.5 text-xs">
                    {picks.map(({ team, n }) => (
                      <li key={team.id} className="rounded bg-chip px-1.5 py-0.5">
                        <span className="text-muted">{team.seed}</span> {team.name}
                        {n > 1 && <span className="font-semibold"> ×{n}</span>}
                      </li>
                    ))}
                    {picks.length === 0 && <li className="text-muted">No picks yet</li>}
                  </ul>
                </div>
              );
            })}
        </div>
      </section>
    </div>
  );
}
