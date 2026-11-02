"use client";

import { useActionState } from "react";
import { signIn } from "../actions";

const field = "mt-1 w-full rounded-md border border-line bg-surface px-3 py-2";

export function SignInForm() {
  const [state, action, pending] = useActionState(signIn, undefined);
  const step = state?.step ?? "email";

  return (
    <form action={action} className="mt-6 space-y-4">
      <label className="block">
        <span className="text-sm font-medium">Email</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          defaultValue={state?.email}
          readOnly={step !== "email"}
          className={`${field} ${step !== "email" ? "text-muted" : ""}`}
        />
      </label>

      {step === "name" && (
        <label className="block">
          <span className="text-sm font-medium">Welcome! What’s your full name?</span>
          <input name="name" required autoFocus autoComplete="name" defaultValue={state?.name} placeholder="Josh Orr" className={field} />
          <span className="mt-1 block text-xs text-muted">Standings show your first name and last initial, like “Josh O”.</span>
        </label>
      )}
      {step === "password" && (
        <>
          {state?.name && <input type="hidden" name="name" value={state.name} />}
          <label className="block">
            <span className="text-sm font-medium">Admin password</span>
            <input name="password" type="password" required autoFocus autoComplete="current-password" className={field} />
          </label>
        </>
      )}

      {state?.error && <p className="text-sm text-loss">{state.error}</p>}
      <button
        disabled={pending}
        className="display w-full rounded-md bg-hardwood px-4 py-2 text-lg font-bold uppercase tracking-wide text-white disabled:opacity-60"
      >
        {pending ? "One sec…" : step === "name" ? "Join the pool" : "Continue"}
      </button>
    </form>
  );
}
