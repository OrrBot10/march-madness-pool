"use client";

import { useActionState, useState, useTransition } from "react";
import {
  addEntry,
  deleteEntry,
  makeActive,
  overrideWinner,
  renameTeams,
  reloadBracket,
  setAsOfDay,
  setPaid,
  syncNow,
  updateSettings,
  type AdminState,
} from "../actions";

const input = "rounded-md border border-line bg-surface px-2 py-1.5 text-sm";
const button = "rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-accent-ink disabled:opacity-60";
const ghost = "rounded-md border border-line px-3 py-1.5 text-sm disabled:opacity-60";

function Status({ state }: { state: AdminState }) {
  if (state?.error) return <span className="text-sm text-loss">{state.error}</span>;
  if (state?.ok) return <span className="text-sm text-gain">{state.ok}</span>;
  return null;
}

/** datetime-local works in the viewer's time zone; convert to an exact instant before sending. */
function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function SettingsForm({ year, status, lockAt }: { year: number; status: string; lockAt: string }) {
  const [state, action, pending] = useActionState(updateSettings.bind(null, year), undefined);
  const [local, setLocal] = useState(toLocalInput(lockAt));
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <label className="text-sm">
        <span className="block font-medium">Status</span>
        <select name="status" defaultValue={status} className={`mt-1 ${input}`}>
          <option value="setup">Setup: bracket under review</option>
          <option value="open">Open: taking picks</option>
          <option value="locked">Locked: games under way</option>
          <option value="complete">Complete</option>
        </select>
      </label>
      <label className="text-sm">
        <span className="block font-medium">Picks lock at (your time)</span>
        <input type="datetime-local" value={local} onChange={(e) => setLocal(e.target.value)} className={`mt-1 ${input}`} />
        <input type="hidden" name="lockAt" value={local ? new Date(local).toISOString() : ""} />
      </label>
      <button disabled={pending} className={button}>
        {pending ? "Saving…" : "Save"}
      </button>
      <Status state={state} />
    </form>
  );
}

export function MakeActiveButton({ year }: { year: number }) {
  const [pending, start] = useTransition();
  return (
    <button disabled={pending} onClick={() => start(() => makeActive(year))} className={ghost}>
      {pending ? "Switching…" : "Show this season on the site"}
    </button>
  );
}

export function SyncButton({ year }: { year: number }) {
  const [state, setState] = useState<AdminState>();
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button disabled={pending} onClick={() => start(async () => setState(await syncNow(year)))} className={button}>
        {pending ? "Checking ESPN…" : "Sync results now"}
      </button>
      <Status state={state} />
    </div>
  );
}

export function AsOfForm({ year, asOfDay }: { year: number; asOfDay: string | null }) {
  const [state, action, pending] = useActionState(setAsOfDay.bind(null, year), undefined);
  const value = asOfDay ? `${asOfDay.slice(0, 4)}-${asOfDay.slice(4, 6)}-${asOfDay.slice(6, 8)}` : "";
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <label className="text-sm">
        <span className="block font-medium">Only count games through</span>
        <input name="asOf" type="date" defaultValue={value} className={`mt-1 ${input}`} />
      </label>
      <button disabled={pending} className={ghost}>
        {pending ? "Replaying…" : "Apply"}
      </button>
      <Status state={state} />
    </form>
  );
}

export function GameOverride(props: {
  year: number;
  espnId: string;
  teams: { id: string | null; label: string }[];
  override: string | null;
}) {
  const [state, setState] = useState<AdminState>();
  const [pending, start] = useTransition();
  return (
    <span className="inline-flex items-center gap-2">
      <select
        aria-label="Winner override"
        disabled={pending}
        defaultValue={props.override ?? ""}
        onChange={(e) =>
          start(async () => setState(await overrideWinner(props.year, props.espnId, e.target.value || null)))
        }
        className={`${input} py-0.5 text-xs`}
      >
        <option value="">ESPN result</option>
        {props.teams
          .filter((t) => t.id)
          .map((t) => (
            <option key={t.id} value={t.id!}>
              {t.label} won
            </option>
          ))}
      </select>
      {state?.error && <span className="text-xs text-loss">{state.error}</span>}
    </span>
  );
}

export function BracketForm(props: { year: number; children: React.ReactNode }) {
  const [state, action, pending] = useActionState(renameTeams.bind(null, props.year), undefined);
  return (
    <form action={action} className="space-y-4">
      {props.children}
      <div className="flex items-center gap-3">
        <button disabled={pending} className={button}>
          {pending ? "Saving…" : "Save names"}
        </button>
        <Status state={state} />
      </div>
    </form>
  );
}

export function ReloadBracketButton({ year }: { year: number }) {
  const [state, setState] = useState<AdminState>();
  const [pending, start] = useTransition();
  return (
    <span className="inline-flex items-center gap-3">
      <button disabled={pending} onClick={() => start(async () => setState(await reloadBracket(year)))} className={ghost}>
        {pending ? "Checking…" : "Re-check against ESPN"}
      </button>
      <Status state={state} />
    </span>
  );
}

export function PaidToggle({ entryId, paid }: { entryId: number; paid: boolean }) {
  const [pending, start] = useTransition();
  return (
    <input
      type="checkbox"
      aria-label="Settled"
      defaultChecked={paid}
      disabled={pending}
      onChange={(e) => {
        const value = e.target.checked;
        start(() => setPaid(entryId, value));
      }}
      className="h-4 w-4 accent-[var(--accent)]"
    />
  );
}

export function DeleteEntryButton({ entryId, name }: { entryId: number; name: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => {
        if (confirm(`Delete ${name}'s entry and all its picks? This can't be undone.`)) start(() => deleteEntry(entryId));
      }}
      className="text-xs text-loss hover:underline disabled:opacity-50"
    >
      Delete
    </button>
  );
}

export function AddEntryForm({ year }: { year: number }) {
  const [state, action, pending] = useActionState(addEntry.bind(null, year), undefined);
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <label className="text-sm">
        <span className="block font-medium">Entry name</span>
        <input name="name" required placeholder="Ron D" className={`mt-1 ${input}`} />
      </label>
      <label className="text-sm">
        <span className="block font-medium">Their email (optional)</span>
        <input name="email" type="email" placeholder="So they can sign in and edit" className={`mt-1 w-64 ${input}`} />
      </label>
      <button disabled={pending} className={button}>
        {pending ? "Adding…" : "Add entry and enter picks"}
      </button>
      <Status state={state} />
    </form>
  );
}
