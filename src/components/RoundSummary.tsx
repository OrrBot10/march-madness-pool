import { money, pct } from "@/lib/format";
import type { PoolResult, Team } from "@/lib/pool/engine";

/** Per-round dividends and the lowest-seed bonuses: the numbers from Josh's round recap emails. */
export function RoundSummary({ result, teams }: { result: PoolResult; teams: Team[] }) {
  const nameById = new Map(teams.map((t) => [t.id, t.name]));
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-lg border border-line bg-surface">
        <h2 className="border-b border-line px-4 py-2 font-semibold">Dividends by round</h2>
        <table className="w-full text-sm tabular">
          <thead className="text-xs text-muted">
            <tr>
              <th className="px-4 py-1.5 text-left font-medium">Round</th>
              <th className="px-4 py-1.5 text-right font-medium">Pool</th>
              <th className="px-4 py-1.5 text-right font-medium">Shares won</th>
              <th className="px-4 py-1.5 text-right font-medium">Per share</th>
            </tr>
          </thead>
          <tbody>
            {result.rounds.map((r) => (
              <tr key={r.round} className="border-t border-line">
                <td className="px-4 py-1.5">{r.name}</td>
                <td className="px-4 py-1.5 text-right">{money(r.pool)}</td>
                <td className="px-4 py-1.5 text-right">
                  {r.complete ? (
                    <>
                      {r.winningShares}{" "}
                      <span className="text-muted">({pct(r.winningShares / Math.max(1, result.totalShares))})</span>
                    </>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td className="px-4 py-1.5 text-right font-semibold">
                  {r.complete ? money(r.dividend) : <span className="font-normal text-muted">pending</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="rounded-lg border border-line bg-surface">
        <h2 className="border-b border-line px-4 py-2 font-semibold">Lowest-seed bonuses</h2>
        <ul className="divide-y divide-line text-sm">
          {result.bonuses.map((b) => (
            <li key={b.round} className="flex items-start justify-between gap-4 px-4 py-2">
              <div>
                <div>{b.name}</div>
                <div className="text-xs text-muted">
                  {b.seed === null
                    ? "Not decided yet"
                    : `${b.teamIds.map((id) => nameById.get(id)).join(" & ")} (${b.seed} seed) · ${b.shares} shares`}
                </div>
              </div>
              <div className="text-right tabular">
                <div className="font-semibold">{money(b.amount)}</div>
                {b.seed !== null && <div className="text-xs text-muted">{money(b.perShare)}/share</div>}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
