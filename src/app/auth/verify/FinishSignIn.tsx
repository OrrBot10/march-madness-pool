"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { finishSignIn, type FormState } from "../../actions";

export function FinishSignIn({ token }: { token: string }) {
  const [state, setState] = useState<FormState>();
  const [pending, start] = useTransition();
  return (
    <div className="mt-6 space-y-3">
      <button
        disabled={pending}
        onClick={() => start(async () => setState(await finishSignIn(token)))}
        className="display w-full rounded-md bg-hardwood px-4 py-3 text-lg font-bold uppercase tracking-wide text-white disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Finish signing in"}
      </button>
      {state?.error && (
        <p className="text-sm text-loss">
          {state.error}{" "}
          <Link href="/signin" className="font-semibold underline">
            Get a new link
          </Link>
        </p>
      )}
    </div>
  );
}
