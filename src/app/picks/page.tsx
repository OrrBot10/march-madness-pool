import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSeason, getSeasonData, picksLocked } from "@/lib/data";
import { money } from "@/lib/format";
import { priceForSeed } from "@/lib/pool/rules";
import { getCurrentPerson } from "@/lib/session";
import { NewEntryForm } from "./NewEntryForm";

export default async function MyPicksPage() {
  const person = await getCurrentPerson();
  if (!person) redirect("/signin");
  const season = await getCurrentSeason();
  if (!season) return <p>No season is set up yet.</p>;

  const { teams, entries } = await getSeasonData(season.year);
  const seedById = new Map(teams.map((t) => [t.id, t.seed]));
  const mine = entries.filter((e) => e.personId === person.id);
  const locked = picksLocked(season);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My picks · {season.year}</h1>
        <p className="mt-1 text-sm text-muted">
          {locked
            ? "Picks are locked."
            : `Edit any time until tip-off of the first Round of 64 game (${season.lockAt.toLocaleString("en-US", {
                dateStyle: "medium",
                timeStyle: "short",
              })}).`}
        </p>
      </div>

      {mine.length === 0 && <p className="text-sm">You don’t have an entry yet.</p>}

      <ul className="grid gap-3 sm:grid-cols-2">
        {mine.map((e) => {
          const shares = Object.values(e.picks).reduce((a, b) => a + b, 0);
          const cost = Object.entries(e.picks).reduce((s, [id, n]) => s + n * priceForSeed(seedById.get(id)!), 0);
          return (
            <li key={e.entryId}>
              <Link
                href={`/picks/${e.entryId}`}
                className="block rounded-lg border border-line bg-surface p-4 hover:border-accent"
              >
                <div className="font-semibold">{e.name}</div>
                <div className="mt-1 text-sm text-muted tabular">
                  {shares} shares · {money(cost, { whole: true })} + {money(e.entryFee, { whole: true })} entry
                </div>
                <div className="mt-2 text-sm font-medium text-accent">{locked ? "View picks →" : "Edit picks →"}</div>
              </Link>
            </li>
          );
        })}
      </ul>

      {!locked && <NewEntryForm defaultName={mine.length === 0 ? person.name : ""} first={mine.length === 0} />}
    </div>
  );
}
