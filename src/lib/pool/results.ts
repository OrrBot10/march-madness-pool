import { GAMES_PER_ROUND } from "@/lib/espn";

export interface SlotRef {
  id: string;
  espnIds: string[];
}

export interface GameOutcome {
  round: number;
  /** ESPN ids of the two teams (null for a TBD side). */
  teamIds: [string | null, string | null];
  /** Set once the game is final (or Josh has entered the winner by hand). */
  winnerId: string | null;
}

export interface DerivedResults {
  wins: Record<string, number>;
  eliminated: Record<string, boolean>;
  /** Highest round N such that rounds 1..N have all their games final. */
  completedRounds: number;
}

/** Turns final games into per-slot wins. First Four games (round 0) don't count: the pair shares a slot. */
export function deriveResults(slots: SlotRef[], games: GameOutcome[]): DerivedResults {
  const slotByEspnId = new Map<string, string>();
  for (const s of slots) for (const id of s.espnIds) slotByEspnId.set(id, s.id);

  const wins: Record<string, number> = Object.fromEntries(slots.map((s) => [s.id, 0]));
  const eliminated: Record<string, boolean> = Object.fromEntries(slots.map((s) => [s.id, false]));
  const finals = new Array(GAMES_PER_ROUND.length).fill(0);

  for (const g of games) {
    if (g.round < 1 || !g.winnerId) continue;
    const winner = slotByEspnId.get(g.winnerId);
    const loserId = g.teamIds.find((id) => id && id !== g.winnerId);
    const loser = loserId ? slotByEspnId.get(loserId) : undefined;
    if (!winner || !loser) throw new Error(`Round ${g.round} game has a team that isn't in the bracket`);
    wins[winner]++;
    eliminated[loser] = true;
    finals[g.round]++;
  }

  let completedRounds = 0;
  while (completedRounds < 6 && finals[completedRounds + 1] === GAMES_PER_ROUND[completedRounds + 1]) {
    completedRounds++;
  }
  return { wins, eliminated, completedRounds };
}
