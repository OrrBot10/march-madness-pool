import { loadHistoryYear } from "@/lib/history-data";
import { money } from "@/lib/format";
import { computePool } from "@/lib/pool/engine";
import { ENTRY_FEE, priceForSeed } from "@/lib/pool/rules";

const YEAR = 2026;

/** A sample entry, scored with that year's real per-share payouts. */
const PICKS = [
  { teamId: "midwest-1", note: "Won the title: paid in all six rounds" },
  { teamId: "south-1", note: "Won one game, then lost" },
  { teamId: "south-9", note: "Won three games to reach the Elite 8, plus that round’s low-seed bonus" },
  { teamId: "west-12", note: "Won one game, plus the first-round low-seed bonus" },
];

export function Example() {
  const data = loadHistoryYear(YEAR);
  if (!data) return null;
  const result = computePool(data);
  const rows = PICKS.map(({ teamId, note }) => {
    const team = data.teams.find((t) => t.id === teamId)!;
    const bonus = result.bonuses.filter((b) => b.teamIds.includes(teamId)).reduce((s, b) => s + b.perShare, 0);
    const dividends = result.returnPerShare[teamId];
    return { team, note, cost: priceForSeed(team.seed), dividends, bonus, total: dividends + bonus };
  });
  const cost = rows.reduce((s, r) => s + r.cost, 0) + ENTRY_FEE;
  const back = rows.reduce((s, r) => s + r.total, 0);
  const r = result.rounds;

  return (
    <section>
      <h2 className="text-lg font-semibold">An example</h2>
      <p className="mt-1">
        Say you bought one share each of these four teams in {YEAR}. Here’s what they paid, using that year’s actual
        dividends: <span className="tabular">{money(r[0].dividend)}</span> per winning share in the Round of 64, then{" "}
        <span className="tabular">{money(r[1].dividend)}</span>, <span className="tabular">{money(r[2].dividend)}</span>,{" "}
        <span className="tabular">{money(r[3].dividend)}</span>, <span className="tabular">{money(r[4].dividend)}</span>{" "}
        and <span className="tabular">{money(r[5].dividend)}</span> for the title game.
      </p>
      <div className="mt-3 overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full min-w-[520px] text-sm tabular">
          <thead className="bg-navy text-left text-xs text-white">
            <tr>
              <th className="px-3 py-2 font-medium">Team</th>
              <th className="px-3 py-2 text-right font-medium">Cost</th>
              <th className="px-3 py-2 text-right font-medium">Dividends</th>
              <th className="px-3 py-2 text-right font-medium">Bonus</th>
              <th className="px-3 py-2 text-right font-medium">Paid back</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.team.id} className="border-t border-line even:bg-chip/70">
                <td className="px-3 py-1.5">
                  <span className="font-medium">
                    <span className="text-muted">{row.team.seed}</span> {row.team.name}
                  </span>
                  <span className="block text-xs text-muted">{row.note}</span>
                </td>
                <td className="px-3 py-1.5 text-right">{money(row.cost, { whole: true })}</td>
                <td className="px-3 py-1.5 text-right">{money(row.dividends)}</td>
                <td className="px-3 py-1.5 text-right">{row.bonus > 0 ? money(row.bonus) : ""}</td>
                <td className="px-3 py-1.5 text-right font-semibold">{money(row.total)}</td>
              </tr>
            ))}
            <tr className="border-t-2 border-line">
              <td className="px-3 py-1.5 text-muted">+ entry fee</td>
              <td className="px-3 py-1.5 text-right">{money(ENTRY_FEE, { whole: true })}</td>
              <td colSpan={3} />
            </tr>
            <tr className="border-t border-line bg-chip font-semibold">
              <td className="px-3 py-2">Total</td>
              <td className="px-3 py-2 text-right">{money(cost, { whole: true })}</td>
              <td colSpan={2} />
              <td className="px-3 py-2 text-right">{money(back)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-sm">
        That entry would have finished <strong className="text-gain">up {money(back - cost)}</strong>. The champion
        did the heavy lifting, the flopped 1 seed barely paid anything, and bonuses turned two cheap teams into solid
        returns. Every year’s dividends are different: more upsets mean fewer winning shares and bigger payouts per
        share.
      </p>
    </section>
  );
}
