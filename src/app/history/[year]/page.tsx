import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import Loading from "@/app/loading";
import { RoundSummary } from "@/components/RoundSummary";
import { StandingsTable } from "@/components/StandingsTable";
import { Stat } from "@/components/Stat";
import { historyYears, loadHistoryYear } from "@/lib/history-data";
import { money } from "@/lib/format";
import { computePool } from "@/lib/pool/engine";

export function generateStaticParams() {
  return historyYears().map((year) => ({ year: String(year) }));
}

export default function HistoryYearPage({ params }: PageProps<"/history/[year]">) {
  return (
    <Suspense fallback={<Loading />}>
      <HistoryYear params={params} />
    </Suspense>
  );
}

async function HistoryYear({ params }: { params: Promise<{ year: string }> }) {
  const { year } = await params;
  const data = loadHistoryYear(Number(year));
  if (!data) notFound();
  const result = computePool(data);
  const champ = data.teams.find((t) => t.wins === 6);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/history" className="text-sm text-muted hover:text-ink">
          ← Past pools
        </Link>
        <h1 className="mt-1 text-2xl font-bold">{data.year} final results</h1>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Entries" value={String(data.entries.length)} />
        <Stat label="Pot" value={money(result.pot + result.feePot, { whole: true })} sub={`${money(result.pot, { whole: true })} shares + ${money(result.feePot, { whole: true })} fees`} />
        <Stat label="Shares" value={String(result.totalShares)} />
        <Stat label="Champion" value={champ?.name ?? "—"} sub={champ ? `${champ.seed} seed` : undefined} />
      </div>
      <RoundSummary result={result} teams={data.teams} />
      <StandingsTable entries={result.entries} showLive={false} />
    </div>
  );
}
