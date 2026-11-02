import { BONUSES, ROUNDS, priceForSeed, type Region } from "./rules";

/** A bracket slot. A First Four pair is one slot ("Texas / NC State"); owners get whichever team wins. */
export interface Team {
  id: string;
  region: Region;
  seed: number;
  name: string;
  /** Tournament games won in rounds 1–6 so far. */
  wins: number;
  /** True once the team has lost a game. */
  eliminated: boolean;
}

export interface Entry {
  id: string;
  name: string;
  entryFee: number;
  /** teamId -> shares */
  picks: Record<string, number>;
}

export interface PoolInput {
  teams: Team[];
  entries: Entry[];
  /**
   * Rounds whose games are all final. Dividends and bonuses are only paid for these,
   * because each round's dividend depends on every share that won in that round.
   */
  completedRounds: number;
}

export interface RoundResult {
  round: number;
  name: string;
  pool: number;
  winningShares: number;
  /** Paid per winning share; 0 if the round isn't complete or no owned team won. */
  dividend: number;
  complete: boolean;
}

export interface BonusResult {
  round: number;
  name: string;
  amount: number;
  /** The seed that won it, or null if not decided yet / no owned team qualified. */
  seed: number | null;
  teamIds: string[];
  shares: number;
  perShare: number;
}

export interface EntryResult {
  entryId: string;
  name: string;
  spent: number;
  entryFee: number;
  winnings: number;
  bonuses: number;
  net: number;
  /** net / (spent + entryFee) */
  pctReturn: number;
  /** Shares still alive (team not eliminated). */
  liveShares: number;
  eliminated: boolean;
}

export interface PoolResult {
  pot: number;
  feePot: number;
  totalShares: number;
  rounds: RoundResult[];
  bonuses: BonusResult[];
  /** teamId -> total shares owned across entries */
  sharesByTeam: Record<string, number>;
  /** teamId -> dividends earned per share so far */
  returnPerShare: Record<string, number>;
  entries: EntryResult[];
  /** Share of the pot paid out in completed rounds (0–1). */
  potPaidPct: number;
}

export function computePool({ teams, entries, completedRounds }: PoolInput): PoolResult {
  const teamById = new Map(teams.map((t) => [t.id, t]));

  const sharesByTeam: Record<string, number> = Object.fromEntries(teams.map((t) => [t.id, 0]));
  for (const entry of entries) {
    for (const [teamId, shares] of Object.entries(entry.picks)) {
      if (!teamById.has(teamId)) throw new Error(`Entry ${entry.name} picked unknown team ${teamId}`);
      sharesByTeam[teamId] += shares;
    }
  }

  const pot = teams.reduce((sum, t) => sum + sharesByTeam[t.id] * priceForSeed(t.seed), 0);
  const feePot = entries.reduce((sum, e) => sum + e.entryFee, 0);
  const totalShares = Object.values(sharesByTeam).reduce((a, b) => a + b, 0);

  const rounds: RoundResult[] = ROUNDS.map(({ round, name, potPct }) => {
    const pool = pot * potPct;
    const winningShares = teams.filter((t) => t.wins >= round).reduce((s, t) => s + sharesByTeam[t.id], 0);
    const complete = round <= completedRounds;
    const dividend = complete && winningShares > 0 ? pool / winningShares : 0;
    return { round, name, pool, winningShares, dividend, complete };
  });

  const returnPerShare: Record<string, number> = {};
  for (const t of teams) {
    returnPerShare[t.id] = rounds.filter((r) => t.wins >= r.round).reduce((s, r) => s + r.dividend, 0);
  }

  const bonuses: BonusResult[] = BONUSES.map(({ round, name, feePct }) => {
    const amount = feePot * feePct;
    const empty = { round, name, amount, seed: null, teamIds: [], shares: 0, perShare: 0 };
    if (round > completedRounds) return empty;
    // Lowest seed = highest seed number among owned teams that won this round.
    const qualifiers = teams.filter((t) => t.wins >= round && sharesByTeam[t.id] > 0);
    if (qualifiers.length === 0) return empty;
    const seed = Math.max(...qualifiers.map((t) => t.seed));
    const winners = qualifiers.filter((t) => t.seed === seed);
    const shares = winners.reduce((s, t) => s + sharesByTeam[t.id], 0);
    return { round, name, amount, seed, teamIds: winners.map((t) => t.id), shares, perShare: amount / shares };
  });

  const bonusPerShare = (teamId: string) =>
    bonuses.reduce((s, b) => s + (b.teamIds.includes(teamId) ? b.perShare : 0), 0);

  const entryResults: EntryResult[] = entries.map((entry) => {
    let spent = 0;
    let winnings = 0;
    let bonusTotal = 0;
    let liveShares = 0;
    for (const [teamId, shares] of Object.entries(entry.picks)) {
      const team = teamById.get(teamId)!;
      spent += shares * priceForSeed(team.seed);
      winnings += shares * returnPerShare[teamId];
      bonusTotal += shares * bonusPerShare(teamId);
      if (!team.eliminated) liveShares += shares;
    }
    const net = winnings + bonusTotal - spent - entry.entryFee;
    const cost = spent + entry.entryFee;
    return {
      entryId: entry.id,
      name: entry.name,
      spent,
      entryFee: entry.entryFee,
      winnings,
      bonuses: bonusTotal,
      net,
      pctReturn: cost > 0 ? net / cost : 0,
      liveShares,
      eliminated: liveShares === 0,
    };
  });

  const paid = rounds.reduce((s, r) => s + (r.dividend > 0 ? r.pool : 0), 0);

  return {
    pot,
    feePot,
    totalShares,
    rounds,
    bonuses,
    sharesByTeam,
    returnPerShare,
    entries: entryResults,
    potPaidPct: pot > 0 ? paid / pot : 0,
  };
}
