import { RoundSummary } from "@/components/RoundSummary";
import { StandingsTable } from "@/components/StandingsTable";
import { Stat } from "@/components/Stat";
import { getCurrentSeason, getSeasonData } from "@/lib/data";
import { money, pct } from "@/lib/format";
import { ROUNDS } from "@/lib/pool/rules";
import { computePool } from "@/lib/pool/engine";

export default async function StandingsPage() {
  const season = await getCurrentSeason();
  if (!season) return <p>No season yet.</p>;
  const { teams, entries } = await getSeasonData(season.year);
  const result = computePool({ teams, entries, completedRounds: season.completedRounds });
  const lastRound = ROUNDS[season.completedRounds - 1];
  const inGreen = result.entries.filter((e) => e.net > 0).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{season.year} standings</h1>
        <p className="mt-1 text-sm text-muted">
          {lastRound
            ? `Through the ${lastRound.name}. The next round’s dividends post once every game in it is final.`
            : "No rounds are complete yet. Dividends post once every game in a round is final."}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Pot paid out" value={pct(result.potPaidPct)} sub={`${money(result.pot * result.potPaidPct, { whole: true })} of ${money(result.pot, { whole: true })}`} />
        <Stat
          label="Break-even line"
          value={`${pct(result.potPaidPct - 1)}`}
          sub="Entries better than this are ahead of pace"
        />
        <Stat label="In the green" value={String(inGreen)} sub={`of ${result.entries.length} entries`} />
        <Stat label="Eliminated" value={String(result.entries.filter((e) => e.eliminated).length)} sub="no teams left" />
      </div>
      <RoundSummary result={result} teams={teams} />
      <StandingsTable entries={result.entries} />
    </div>
  );
}
