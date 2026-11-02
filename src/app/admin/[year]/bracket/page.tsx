import { notFound } from "next/navigation";
import { Suspense } from "react";
import Loading from "@/app/loading";
import { getSeason, getSeasonData } from "@/lib/data";
import { REGIONS, priceForSeed } from "@/lib/pool/rules";
import { requireAdmin } from "@/lib/session";
import { BracketForm, ReloadBracketButton } from "../controls";
import { SeasonHeader } from "../SeasonHeader";

export default function AdminBracketPage({ params }: PageProps<"/admin/[year]/bracket">) {
  return (
    <Suspense fallback={<Loading />}>
      <AdminBracket params={params} />
    </Suspense>
  );
}

async function AdminBracket({ params }: { params: Promise<{ year: string }> }) {
  await requireAdmin();
  const season = await getSeason(Number((await params).year));
  if (!season) notFound();
  const { teams } = await getSeasonData(season.year);

  return (
    <div className="space-y-6">
      <SeasonHeader season={season} current="/bracket" />
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <p className="max-w-2xl text-muted">
          These are the 64 slots players buy shares in. Names come from ESPN; shorten or fix any you like. First Four
          pairs share one slot. When it looks right, set the status to <strong>Open</strong> on the Results tab.
        </p>
        {season.startDay && <ReloadBracketButton year={season.year} />}
      </div>
      <BracketForm year={season.year}>
        <div className="grid gap-4 lg:grid-cols-2">
          {REGIONS.map((region) => (
            <section key={region} className="overflow-hidden rounded-lg border border-line bg-surface">
              <h2 className="border-b border-line bg-chip px-4 py-2 text-sm font-semibold uppercase tracking-wide">
                {region}
              </h2>
              <ul className="divide-y divide-line text-sm">
                {teams
                  .filter((t) => t.region === region)
                  .sort((a, b) => a.seed - b.seed)
                  .map((t) => (
                    <li key={t.id} className="grid grid-cols-[1.5rem_1fr_2.5rem] items-center gap-2 px-4 py-1">
                      <span className="text-muted tabular">{t.seed}</span>
                      <input
                        name={`name:${t.id}`}
                        defaultValue={t.name}
                        aria-label={`${region} ${t.seed} seed name`}
                        className="rounded border border-transparent bg-transparent px-1.5 py-1 hover:border-line focus:border-line"
                      />
                      <span className="text-right text-muted tabular">${priceForSeed(t.seed)}</span>
                    </li>
                  ))}
              </ul>
            </section>
          ))}
        </div>
      </BracketForm>
    </div>
  );
}
