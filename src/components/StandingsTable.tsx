import { money, net, pct } from "@/lib/format";
import type { EntryResult } from "@/lib/pool/engine";

/** Money Standings, laid out like the spreadsheet tab, best net first. */
export function StandingsTable({ entries, showLive = true }: { entries: EntryResult[]; showLive?: boolean }) {
  const rows = [...entries].sort((a, b) => b.net - a.net);
  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-surface">
      <table className="w-full min-w-[640px] text-sm tabular">
        <thead className="bg-navy text-left text-xs text-white">
          <tr>
            <th className="px-3 py-2 font-medium">#</th>
            <th className="px-3 py-2 font-medium">Entry</th>
            <th className="px-3 py-2 text-right font-medium">Shares spent</th>
            <th className="px-3 py-2 text-right font-medium">Winnings</th>
            <th className="px-3 py-2 text-right font-medium">Bonuses</th>
            <th className="px-3 py-2 text-right font-medium">Total net</th>
            <th className="px-3 py-2 text-right font-medium">% P/L</th>
            {showLive && <th className="px-3 py-2 text-right font-medium">Live shares</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((e, i) => {
            const up = e.net > 0.004;
            return (
              <tr key={e.entryId} className="border-t border-line">
                <td className="px-3 py-1.5 text-muted">{i + 1}</td>
                <td className="px-3 py-1.5 font-medium">
                  {e.name}
                  {showLive && e.eliminated && (
                    <span className="ml-2 rounded bg-chip px-1.5 py-0.5 text-[11px] font-normal text-muted">out</span>
                  )}
                </td>
                <td className="px-3 py-1.5 text-right">{money(e.spent)}</td>
                <td className="px-3 py-1.5 text-right">{money(e.winnings)}</td>
                <td className="px-3 py-1.5 text-right">{e.bonuses > 0 ? money(e.bonuses) : ""}</td>
                <td className={`px-3 py-1.5 text-right font-semibold ${up ? "bg-gain-bg text-gain" : ""}`}>
                  {net(e.net)}
                </td>
                <td className={`px-3 py-1.5 text-right ${up ? "bg-gain-bg text-gain" : e.net < 0 ? "text-loss" : ""}`}>
                  {pct(e.pctReturn)}
                </td>
                {showLive && <td className="px-3 py-1.5 text-right">{e.liveShares}</td>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
