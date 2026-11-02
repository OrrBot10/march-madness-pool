import Link from "next/link";
import { getSeasons } from "@/lib/data";
import { requireAdmin } from "@/lib/session";
import { NewSeasonForm } from "./NewSeasonForm";

export default async function AdminHome() {
  await requireAdmin();
  const seasons = await getSeasons();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin</h1>

      <section className="overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-navy text-left text-xs text-white">
            <tr>
              <th className="px-3 py-2 font-medium">Season</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Picks lock</th>
              <th className="px-3 py-2 font-medium">Last ESPN sync</th>
            </tr>
          </thead>
          <tbody>
            {seasons.map((s) => (
              <tr key={s.year} className="border-t border-line">
                <td className="px-3 py-2">
                  <Link href={`/admin/${s.year}`} className="font-semibold text-accent hover:underline">
                    {s.year}
                  </Link>
                  {s.active && <span className="ml-2 rounded bg-gain-bg px-1.5 py-0.5 text-xs text-gain">on site</span>}
                  {s.asOfDay && <span className="ml-2 rounded bg-chip px-1.5 py-0.5 text-xs text-muted">replay</span>}
                </td>
                <td className="px-3 py-2 capitalize">{s.status}</td>
                <td className="px-3 py-2">{s.lockAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</td>
                <td className="px-3 py-2 text-muted">
                  {s.lastSyncError ? (
                    <span className="text-loss">Failed</span>
                  ) : s.lastSyncAt ? (
                    s.lastSyncAt.toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" })
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="rounded-lg border border-line bg-surface p-4">
        <h2 className="font-semibold">Start a new season</h2>
        <p className="mt-1 text-sm text-muted">
          After Selection Sunday, enter the date of the first First Four game (the Tuesday). The app pulls the 64-team
          bracket and game times from ESPN. You can review names before opening picks.
        </p>
        <NewSeasonForm />
      </section>
    </div>
  );
}
