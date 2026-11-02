import { money, pct } from "@/lib/format";
import type { PoolResult, Team } from "@/lib/pool/engine";

const BONUS_LABELS = ["Win a game", "Reach Sweet 16", "Reach Elite 8", "Reach Final Four"];

/** Per-round dividends and the lowest-seed bonuses (the numbers from Josh's round recap emails), kept compact. */
export function RoundSummary({ result, teams }: { result: PoolResult; teams: Team[] }) {
  const nameById = new Map(teams.map((t) => [t.id, t.name]));
  const cell = "px-3 py-0.5";
  return (
    <div className="grid gap-3 text-[13px] lg:grid-cols-2">
      <section className="rounded-lg border border-line bg-surface">
        <h2 className="border-b border-line px-3 py-1.5 text-sm font-semibold">Dividends by round</h2>
        <table className="w-full tabular">
          <thead className="text-[11px] text-muted">
            <tr>
              <th className={`${cell} pt-1 text-left font-medium`}>Round</th>
              <th className={`${cell} pt-1 text-right font-medium`}>Pool</th>
              <th className={`${cell} pt-1 text-right font-medium`}>Shares won</th>
              <th className={`${cell} pt-1 text-right font-medium`}>Per share</th>
            </tr>
          </thead>
          <tbody>
            {result.rounds.map((r) => (
              <tr key={r.round}>
                <td className={cell}>{r.name}</td>
                <td className={`${cell} text-right`}>{money(r.pool, { whole: true })}</td>
                <td className={`${cell} text-right`}>
                  {r.complete ? (
                    <>
                      {r.winningShares}{" "}
                      <span className="text-muted">({pct(r.winningShares / Math.max(1, result.totalShares))})</span>
                    </>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td className={`${cell} text-right font-semibold`}>
                  {r.complete ? money(r.dividend) : <span className="font-normal text-muted">pending</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="rounded-lg border border-line bg-surface">
        <h2 className="border-b border-line px-3 py-1.5 text-sm font-semibold">Lowest-seed bonuses</h2>
        <table className="w-full tabular">
          <thead className="text-[11px] text-muted">
            <tr>
              <th className={`${cell} pt-1 text-left font-medium`}>Bonus</th>
              <th className={`${cell} pt-1 text-left font-medium`}>Team</th>
              <th className={`${cell} pt-1 text-right font-medium`}>Pot</th>
              <th className={`${cell} pt-1 text-right font-medium`}>Per share</th>
            </tr>
          </thead>
          <tbody>
            {result.bonuses.map((b, i) => (
              <tr key={b.round}>
                <td className={`${cell} whitespace-nowrap`}>{BONUS_LABELS[i] ?? b.name}</td>
                <td className={cell}>
                  {b.seed === null ? (
                    <span className="text-muted">Not decided yet</span>
                  ) : (
                    <>
                      {b.teamIds.map((id) => nameById.get(id)).join(" & ")}{" "}
                      <span className="text-muted">
                        ({b.seed}) · {b.shares} sh
                      </span>
                    </>
                  )}
                </td>
                <td className={`${cell} text-right`}>{money(b.amount, { whole: true })}</td>
                <td className={`${cell} text-right font-semibold`}>{b.seed !== null ? money(b.perShare) : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
