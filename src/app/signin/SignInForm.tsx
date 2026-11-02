"use client";

import { useActionState } from "react";
import { signIn } from "../actions";

export function SignInForm() {
  const [state, action, pending] = useActionState(signIn, undefined);

  if (state?.ok) {
    return (
      <div className="mt-6 space-y-3 rounded-lg border border-line bg-surface p-4">
        <p className="font-semibold">{state.ok}</p>
        <p className="text-sm text-muted">Can’t find it? Check spam or junk, or go back and try again.</p>
        {state.devLink && (
          <p className="rounded-md bg-chip p-3 text-xs">
            Local testing (no email service set up):{" "}
            <a href={state.devLink} className="font-semibold text-accent underline">
              open the sign-in link
            </a>
          </p>
        )}
      </div>
    );
  }

  return (
    <form action={action} className="mt-6 space-y-4">
      <label className="block">
        <span className="text-sm font-medium">Full name</span>
        <input
          name="name"
          required
          autoComplete="name"
          placeholder="Josh Orr"
          className="mt-1 w-full rounded-md border border-line bg-surface px-3 py-2"
        />
        <span className="mt-1 block text-xs text-muted">Standings show your first name and last initial, like “Josh O”.</span>
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
        className="display w-full rounded-md bg-hardwood px-4 py-2 text-lg font-bold uppercase tracking-wide text-white disabled:opacity-60"
      >
        {pending ? "Sending…" : "Email me a sign-in link"}
      </button>
    </form>
  );
}
