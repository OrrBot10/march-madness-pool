"use client";

import { useActionState } from "react";
import { createSeason } from "./actions";

export function NewSeasonForm() {
  const [state, action, pending] = useActionState(createSeason, undefined);
  const year = new Date().getFullYear() + (new Date().getMonth() > 4 ? 1 : 0);
  return (
    <form action={action} className="mt-3 flex flex-wrap items-end gap-3">
      <label className="text-sm">
        <span className="block font-medium">Year</span>
        <input name="year" type="number" defaultValue={year} className="mt-1 w-24 rounded-md border border-line bg-surface px-2 py-1.5" />
      </label>
      <label className="text-sm">
        <span className="block font-medium">First Four starts</span>
        <input name="startDate" type="date" required className="mt-1 rounded-md border border-line bg-surface px-2 py-1.5" />
      </label>
      <button disabled={pending} className="rounded-md bg-accent px-4 py-2 font-semibold text-accent-ink disabled:opacity-60">
        {pending ? "Pulling bracket from ESPN…" : "Create season"}
      </button>
      {state?.error && <p className="w-full text-sm text-loss">{state.error}</p>}
    </form>
  );
}
