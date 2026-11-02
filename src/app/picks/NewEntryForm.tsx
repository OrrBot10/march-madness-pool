"use client";

import { useActionState } from "react";
import { newEntry } from "../actions";

export function NewEntryForm({ shownAs }: { shownAs: string }) {
  const [state, action, pending] = useActionState(newEntry, undefined);
  return (
    <form action={action} className="rounded-lg border border-dashed border-line p-4">
      <h2 className="text-lg">Start your entry</h2>
      <p className="mt-1 text-sm text-muted">
        You’ll show up in the standings as <strong className="text-ink">{shownAs}</strong>.
      </p>
      <button
        disabled={pending}
        className="display mt-3 rounded-md bg-hardwood px-5 py-2 text-lg font-bold uppercase tracking-wide text-white disabled:opacity-60"
      >
        {pending ? "Creating…" : "Start picking"}
      </button>
      {state?.error && <p className="mt-2 text-sm text-loss">{state.error}</p>}
    </form>
  );
}
