"use client";

import { useActionState } from "react";
import { newEntry } from "../actions";

export function NewEntryForm({ defaultName }: { defaultName: string }) {
  const [state, action, pending] = useActionState(newEntry, undefined);
  return (
    <form action={action} className="rounded-lg border border-dashed border-line p-4">
      <h2 className="font-semibold">Start your entry</h2>
      <p className="mt-1 text-sm text-muted">This is the name everyone sees in the standings.</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          name="name"
          defaultValue={defaultName}
          placeholder="Josh O"
          className="flex-1 rounded-md border border-line bg-surface px-3 py-2"
        />
        <button
          disabled={pending}
          className="rounded-md bg-accent px-4 py-2 font-semibold text-accent-ink disabled:opacity-60"
        >
          {pending ? "Creating…" : "Start picking"}
        </button>
      </div>
      {state?.error && <p className="mt-2 text-sm text-loss">{state.error}</p>}
    </form>
  );
}
