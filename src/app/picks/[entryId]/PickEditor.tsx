"use client";

import { useMemo, useState, useTransition } from "react";
import { money } from "@/lib/format";
import { REGIONS, priceForSeed, type Region } from "@/lib/pool/rules";
import { savePicks, type FormState } from "../../actions";

interface EditorTeam {
  id: string;
  region: Region;
  seed: number;
  name: string;
}

export function PickEditor(props: {
  entryId: number;
  teams: EditorTeam[];
  initial: Record<string, number>;
  othersByTeam: Record<string, number>;
  entryFee: number;
  locked: boolean;
}) {
  const { entryId, teams, othersByTeam, entryFee, locked } = props;
  const [saved, setSaved] = useState(props.initial);
  const [shares, setShares] = useState(props.initial);
  const [status, setStatus] = useState<FormState>();
  const [pending, startTransition] = useTransition();

  const totals = useMemo(() => {
    let count = 0;
    let cost = 0;
    for (const t of teams) {
      const n = shares[t.id] ?? 0;
      count += n;
      cost += n * priceForSeed(t.seed);
    }
    return { count, cost };
  }, [shares, teams]);

  const dirty = teams.some((t) => (shares[t.id] ?? 0) !== (saved[t.id] ?? 0));

  function update(id: string, next: (current: number) => number) {
    setStatus(undefined);
    setShares((s) => ({ ...s, [id]: Math.max(0, Math.min(500, next(s[id] ?? 0))) }));
  }

  function save() {
    startTransition(async () => {
      const result = await savePicks(entryId, shares);
      setStatus(result);
      if (result?.ok) setSaved(shares);
    });
  }

  return (
    <>
      <div className="grid gap-4 pb-28 lg:grid-cols-2">
        {REGIONS.map((region) => (
          <section key={region} className="overflow-hidden rounded-lg border border-line bg-surface">
            <h2 className="border-b border-line bg-chip px-4 py-2 text-sm font-semibold uppercase tracking-wide">
              {region}
            </h2>
            <table className="w-full text-sm">
              <thead className="text-xs text-muted">
                <tr>
                  <th className="w-10 px-2 py-1.5 text-left font-medium">Seed</th>
                  <th className="px-2 py-1.5 text-left font-medium">Team</th>
                  <th className="px-2 py-1.5 text-right font-medium">Price</th>
                  <th className="hidden px-2 py-1.5 text-right font-medium sm:table-cell" title="Shares other entries hold">
                    Others
                  </th>
                  <th className="px-2 py-1.5 text-center font-medium">Shares</th>
                </tr>
              </thead>
              <tbody>
                {teams
                  .filter((t) => t.region === region)
                  .sort((a, b) => a.seed - b.seed)
                  .map((t) => {
                    const n = shares[t.id] ?? 0;
                    return (
                      <tr key={t.id} className={`border-t border-line ${n > 0 ? "bg-accent/5" : ""}`}>
                        <td className="px-2 py-1.5 text-muted tabular">{t.seed}</td>
                        <td className="px-2 py-1.5 font-medium">{t.name}</td>
                        <td className="px-2 py-1.5 text-right tabular">${priceForSeed(t.seed)}</td>
                        <td className="hidden px-2 py-1.5 text-right text-muted tabular sm:table-cell">
                          {othersByTeam[t.id] ?? 0}
                        </td>
                        <td className="px-2 py-1">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              aria-label={`One fewer share of ${t.name}`}
                              disabled={locked || n === 0}
                              onClick={() => update(t.id, (c) => c - 1)}
                              className="h-7 w-7 rounded border border-line text-base leading-none disabled:opacity-30"
                            >
                              −
                            </button>
                            <input
                              aria-label={`Shares of ${t.name}`}
                              inputMode="numeric"
                              disabled={locked}
                              value={n === 0 ? "" : n}
                              placeholder="0"
                              onChange={(e) => {
                                const typed = Number(e.target.value.replace(/\D/g, "")) || 0;
                                update(t.id, () => typed);
                              }}
                              className="h-7 w-10 rounded border border-line bg-surface text-center tabular"
                            />
                            <button
                              type="button"
                              aria-label={`One more share of ${t.name}`}
                              disabled={locked}
                              onClick={() => update(t.id, (c) => c + 1)}
                              className="h-7 w-7 rounded border border-line text-base leading-none disabled:opacity-30"
                            >
                              +
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </section>
        ))}
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="text-sm tabular">
            <span className="font-semibold">{totals.count} shares</span>
            <span className="text-muted"> · {money(totals.cost, { whole: true })} + {money(entryFee, { whole: true })} entry = </span>
            <span className="font-semibold">{money(totals.cost + entryFee, { whole: true })}</span>
          </div>
          <div className="flex items-center gap-3">
            {status?.error && <span className="text-sm text-loss">{status.error}</span>}
            {status?.ok && !dirty && <span className="text-sm text-gain">{status.ok}</span>}
            {dirty && !pending && <span className="text-sm text-muted">Unsaved changes</span>}
            {!locked && (
              <button
                onClick={save}
                disabled={!dirty || pending}
                className="rounded-md bg-accent px-5 py-2 font-semibold text-accent-ink disabled:opacity-50"
              >
                {pending ? "Saving…" : "Save picks"}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
