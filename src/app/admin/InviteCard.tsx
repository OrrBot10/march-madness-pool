"use client";

import { useState, useTransition } from "react";
import { resetInvite } from "./actions";

export function InviteCard({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();
  return (
    <section className="rounded-lg border border-line bg-surface p-4">
      <h2 className="text-lg">Invite link</h2>
      <p className="mt-1 text-sm text-muted">
        Paste this into your invite email. It never expires. Players use it to join, and again any time they need to
        sign back in. Only people with this link can sign up or log in.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-md bg-chip px-3 py-2 text-sm">{url}</code>
        <button
          onClick={async () => {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-accent-ink"
        >
          {copied ? "Copied!" : "Copy link"}
        </button>
        <button
          disabled={pending}
          onClick={() => {
            if (confirm("Make a new invite link? The old link stops working for anyone who hasn't signed in yet.")) {
              start(() => resetInvite());
            }
          }}
          className="rounded-md border border-line px-3 py-2 text-sm disabled:opacity-60"
        >
          {pending ? "Resetting…" : "Reset link"}
        </button>
      </div>
    </section>
  );
}
