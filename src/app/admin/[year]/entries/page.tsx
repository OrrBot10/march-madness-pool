import Link from "next/link";
import { inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import Loading from "@/app/loading";
import { getSeason, getSeasonData } from "@/lib/data";
import { getDb } from "@/lib/db";
import { people } from "@/lib/db/schema";
import { money, net } from "@/lib/format";
import { computePool } from "@/lib/pool/engine";
import { requireAdmin } from "@/lib/session";
import { AddEntryForm, DeleteEntryButton, PaidToggle } from "../controls";
import { SeasonHeader } from "../SeasonHeader";

export default function AdminEntriesPage({ params }: PageProps<"/admin/[year]/entries">) {
  return (
    <Suspense fallback={<Loading />}>
      <AdminEntries params={params} />
    </Suspense>
  );
}

async function AdminEntries({ params }: { params: Promise<{ year: string }> }) {
  await requireAdmin();
  const season = await getSeason(Number((await params).year));
  if (!season) notFound();
  const { teams, entries, completedRounds } = await getSeasonData(season.year);
  const result = computePool({ teams, entries, completedRounds });

  const personIds = entries.map((e) => e.personId).filter((id): id is number => id !== null);
  const db = await getDb();
  const owners = personIds.length ? await db.select().from(people).where(inArray(people.id, personIds)) : [];
  const emailById = new Map(owners.map((p) => [p.id, p.email]));

  const rows = entries
    .map((e) => ({ entry: e, r: result.entries.find((x) => x.entryId === e.id)! }))
    .sort((a, b) => a.entry.name.localeCompare(b.entry.name));
  const owed = rows.filter((x) => x.r.net < -0.004 && !x.entry.paid).reduce((s, x) => s - x.r.net, 0);
  const toPay = rows.filter((x) => x.r.net > 0.004 && !x.entry.paid).reduce((s, x) => s + x.r.net, 0);
  const final = completedRounds === 6;

  return (
    <div className="space-y-6">
      <SeasonHeader season={season} current="/entries" />

      <section className="rounded-lg border border-line bg-surface p-4">
        <h2 className="font-semibold">Add an entry for someone</h2>
        <p className="mt-1 text-sm text-muted">For players who send you picks by text or email. You’ll go straight to their picks.</p>
        <div className="mt-3">
          <AddEntryForm year={season.year} />
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
        <div className="rounded-lg border border-line bg-surface p-3">
          <div className="text-muted">Entries</div>
          <div className="text-xl font-bold tabular">{entries.length}</div>
        </div>
        <div className="rounded-lg border border-line bg-surface p-3">
          <div className="text-muted">Still to collect</div>
          <div className="text-xl font-bold tabular">{money(owed)}</div>
        </div>
        <div className="rounded-lg border border-line bg-surface p-3">
          <div className="text-muted">Still to pay out</div>
          <div className="text-xl font-bold tabular">{money(toPay)}</div>
        </div>
      </div>
      {!final && (
        <p className="text-sm text-muted">
          Amounts below are as of the last completed round and will change until the championship is final.
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full min-w-[760px] text-sm tabular">
          <thead className="bg-navy text-left text-xs text-white">
            <tr>
              <th className="px-3 py-2 font-medium">Entry</th>
              <th className="px-3 py-2 font-medium">Login</th>
              <th className="px-3 py-2 text-right font-medium">Shares</th>
              <th className="px-3 py-2 text-right font-medium">Spent + fee</th>
              <th className="px-3 py-2 text-right font-medium">Net</th>
              <th className="px-3 py-2 font-medium">Settle up</th>
              <th className="px-3 py-2 text-center font-medium">Settled</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map(({ entry: e, r }) => {
              const shares = Object.values(e.picks).reduce((a, b) => a + b, 0);
              return (
                <tr key={e.entryId} className={`border-t border-line ${e.paid ? "text-muted" : ""}`}>
                  <td className="px-3 py-1.5 font-medium">
                    <Link href={`/picks/${e.entryId}`} className="hover:text-accent hover:underline">
                      {e.name}
                    </Link>
                  </td>
                  <td className="px-3 py-1.5 text-xs text-muted">
                    {e.personId ? emailById.get(e.personId) : "none"}
                  </td>
                  <td className="px-3 py-1.5 text-right">{shares}</td>
                  <td className="px-3 py-1.5 text-right">{money(r.spent + r.entryFee)}</td>
                  <td className={`px-3 py-1.5 text-right font-semibold ${r.net > 0.004 ? "text-gain" : r.net < -0.004 ? "text-loss" : ""}`}>
                    {net(r.net)}
                  </td>
                  <td className="px-3 py-1.5">
                    {r.net > 0.004 ? `Pay them ${money(r.net)}` : r.net < -0.004 ? `They owe ${money(-r.net)}` : "Even"}
                  </td>
                  <td className="px-3 py-1.5 text-center">
                    <PaidToggle entryId={e.entryId} paid={e.paid} />
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    <DeleteEntryButton entryId={e.entryId} name={e.name} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
