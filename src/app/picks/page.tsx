import { redirect } from "next/navigation";
import { getCurrentSeason, getSeasonData, picksLocked } from "@/lib/data";
import { getCurrentPerson } from "@/lib/session";
import { NewEntryForm } from "./NewEntryForm";

/** One entry per person: go straight to it, or offer to start it. */
export default async function MyPicksPage() {
  const person = await getCurrentPerson();
  if (!person) redirect("/signin");
  const season = await getCurrentSeason();
  if (!season) return <p>No season is set up yet.</p>;

  const { entries } = await getSeasonData(season.year);
  const mine = entries.find((e) => e.personId === person.id);
  if (mine) redirect(`/picks/${mine.entryId}`);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My picks · {season.year}</h1>
        <p className="mt-1 text-sm text-muted">
          {picksLocked(season)
            ? "Picks are locked, and you didn’t enter this year. See you next March!"
            : `Edit any time until tip-off of the first Round of 64 game (${season.lockAt.toLocaleString("en-US", {
                dateStyle: "medium",
                timeStyle: "short",
              })}).`}
        </p>
      </div>
      {!picksLocked(season) && <NewEntryForm defaultName={person.name} />}
    </div>
  );
}
