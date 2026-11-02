import Link from "next/link";
import { historyYears, loadHistoryYear } from "@/lib/history-data";
import { money, net, pct } from "@/lib/format";
import { computePool } from "@/lib/pool/engine";

export default async function HistoryPage() {
  "use cache";
  const years = historyYears().map((year) => {
    const data = loadHistoryYear(year)!;
    const result = computePool(data);
    const champ = data.teams.find((t) => t.wins === 6);
    const best = [...result.entries].sort((a, b) => b.net - a.net)[0];
    const r64 = result.rounds[0];
    const s16 = result.rounds[1];
    return { year, data, result, champ, best, r64, s16 };
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Past pools</h1>
      <div className="overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full min-w-[720px] text-sm tabular">
          <thead className="bg-navy text-left text-xs text-white">
            <tr>
              <th className="px-3 py-2 font-medium">Year</th>
              <th className="px-3 py-2 text-right font-medium">Entries</th>
              <th className="px-3 py-2 text-right font-medium">Shares</th>
              <th className="px-3 py-2 text-right font-medium">Pot</th>
              <th className="px-3 py-2 text-right font-medium">Survived R64</th>
              <th className="px-3 py-2 text-right font-medium">Reached S16</th>
              <th className="px-3 py-2 font-medium">Champion</th>
              <th className="px-3 py-2 font-medium">Top entry</th>
            </tr>
          </thead>
          <tbody>
            {years.map(({ year, data, result, champ, best, r64, s16 }) => (
              <tr key={year} className="border-t border-line">
                <td className="px-3 py-2 font-semibold">
                  <Link href={`/history/${year}`} className="text-accent hover:underline">
                    {year}
                  </Link>
                </td>
                <td className="px-3 py-2 text-right">{data.entries.length}</td>
                <td className="px-3 py-2 text-right">{result.totalShares}</td>
                <td className="px-3 py-2 text-right">{money(result.pot + result.feePot, { whole: true })}</td>
                <td className="px-3 py-2 text-right">{pct(r64.winningShares / result.totalShares)}</td>
                <td className="px-3 py-2 text-right">{pct(s16.winningShares / result.totalShares)}</td>
                <td className="px-3 py-2">{champ?.name}</td>
                <td className="px-3 py-2">
                  {best.name} <span className="text-gain">{net(best.net)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted">
        Recomputed from each year’s workbook. 2026 includes two corrections: Miami’s unpaid round-1 dividend and a $4
        bonus typo.
      </p>
    </div>
  );
}
