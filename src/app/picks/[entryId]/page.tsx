import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import Loading from "@/app/loading";
import { getCurrentSeason, getSeasonData, picksLocked } from "@/lib/data";
import { getCurrentPerson } from "@/lib/session";
import { PickEditor } from "./PickEditor";

export default function EditPicksPage({ params }: PageProps<"/picks/[entryId]">) {
  return (
    <Suspense fallback={<Loading />}>
      <EditPicks params={params} />
    </Suspense>
  );
}

async function EditPicks({ params }: { params: Promise<{ entryId: string }> }) {
  const { entryId } = await params;
  const person = await getCurrentPerson();
  if (!person) redirect("/signin");
  const season = await getCurrentSeason();
  if (!season) notFound();

  const { teams, entries } = await getSeasonData(season.year);
  const entry = entries.find((e) => e.entryId === Number(entryId));
  if (!entry || (entry.personId !== person.id && !person.isAdmin)) notFound();

  // Shares everyone else holds, so players can see where the crowd is before they commit.
  const othersByTeam: Record<string, number> = {};
  for (const e of entries) {
    if (e.entryId === entry.entryId) continue;
    for (const [id, n] of Object.entries(e.picks)) othersByTeam[id] = (othersByTeam[id] ?? 0) + n;
  }

  return (
    <div className="space-y-4">
      <div>
        <Link href="/picks" className="text-sm text-muted hover:text-ink">
          ← My picks
        </Link>
        <h1 className="mt-1 text-2xl font-bold">{entry.name}</h1>
        <p className="mt-1 text-sm text-muted">
          Buy shares in any team. Each round, that round’s slice of the pot is split across every share whose team won.
          First Four pairs count as one team.
        </p>
      </div>
      <PickEditor
        entryId={entry.entryId}
        teams={teams.map(({ id, region, seed, name }) => ({ id, region, seed, name }))}
        initial={entry.picks}
        othersByTeam={othersByTeam}
        entryFee={entry.entryFee}
        locked={picksLocked(season) && !person.isAdmin}
      />
    </div>
  );
}
