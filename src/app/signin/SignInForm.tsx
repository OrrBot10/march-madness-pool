"use client";

import { useActionState } from "react";
import { signIn } from "../actions";

export function SignInForm() {
  const [state, action, pending] = useActionState(signIn, undefined);
  return (
    <form action={action} className="mt-6 space-y-4">
      <label className="block">
        <span className="text-sm font-medium">Name (as it shows in standings)</span>
        <input
          name="name"
          required
          placeholder="Josh O"
          className="mt-1 w-full rounded-md border border-line bg-surface px-3 py-2"
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium">Email</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="mt-1 w-full rounded-md border border-line bg-surface px-3 py-2"
        />
      </label>
      {state?.error && <p className="text-sm text-loss">{state.error}</p>}
      <button
        disabled={pending}
        className="w-full rounded-md bg-accent px-4 py-2 font-semibold text-accent-ink disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Continue"}
      </button>
    </form>
  );
}
