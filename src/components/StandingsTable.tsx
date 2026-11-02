import { money, net, pct } from "@/lib/format";
import type { EntryResult } from "@/lib/pool/engine";

/**
 * Money Standings, laid out like the spreadsheet tab, best net first. Kept to a readable width
 * (not stretched across the page) with alternate rows shaded so each row is easy to follow.
 */
export function StandingsTable({ entries, showLive = true }: { entries: EntryResult[]; showLive?: boolean }) {
  const rows = [...entries].sort((a, b) => b.net - a.net);
  const cell = "px-2.5 py-1 text-right";
  return (
    <div className="max-w-3xl overflow-x-auto rounded-lg border border-line bg-surface">
      <table className="w-full min-w-[560px] text-sm tabular">
        <thead className="bg-navy text-left text-xs text-white">
          <tr>
            <th className="w-8 px-2.5 py-2 font-medium">#</th>
            <th className="px-2.5 py-2 font-medium">Entry</th>
            <th className="px-2.5 py-2 text-right font-medium">Spent</th>
            <th className="px-2.5 py-2 text-right font-medium">Winnings</th>
            <th className="px-2.5 py-2 text-right font-medium">Bonuses</th>
            <th className="px-2.5 py-2 text-right font-medium">Total net</th>
            <th className="px-2.5 py-2 text-right font-medium">% P/L</th>
            {showLive && <th className="px-2.5 py-2 text-right font-medium">Live</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((e, i) => {
            const up = e.net > 0.004;
            return (
              <tr key={e.entryId} className="border-t border-line even:bg-chip/70 hover:bg-sky/15">
                <td className="px-2.5 py-1 text-muted">{i + 1}</td>
                <td className="whitespace-nowrap px-2.5 py-1 font-medium">
                  {e.name}
                  {showLive && e.eliminated && (
                    <span className="ml-2 rounded bg-chip px-1.5 py-0.5 text-[11px] font-normal text-muted">out</span>
                  )}
                </td>
                <td className={cell}>{money(e.spent)}</td>
                <td className={cell}>{money(e.winnings)}</td>
                <td className={cell}>{e.bonuses > 0 ? money(e.bonuses) : ""}</td>
                <td className={`${cell} font-semibold ${up ? "bg-gain-bg text-gain" : ""}`}>{net(e.net)}</td>
                <td className={`${cell} ${up ? "bg-gain-bg text-gain" : e.net < 0 ? "text-loss" : ""}`}>
                  {pct(e.pctReturn)}
                </td>
                {showLive && <td className={cell}>{e.liveShares}</td>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
