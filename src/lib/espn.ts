// ESPN's public (undocumented) scoreboard API. One request per tournament day.
// groups=100 limits it to NCAA tournament games; headlines look like
// "NCAA Men's Basketball Championship - East Region - 1st Round".
import { REGIONS, type Region } from "@/lib/pool/rules";

const SCOREBOARD = "https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard";
const HEADLINE_PREFIX = "NCAA Men's Basketball Championship";

/** 0 = First Four (not a pool round), 1 = Round of 64 … 6 = championship. */
const ROUND_BY_LABEL: Record<string, number> = {
  "First Four": 0,
  "1st Round": 1,
  "2nd Round": 2,
  "Sweet 16": 3,
  "Elite 8": 4,
  "Final Four": 5,
  "National Championship": 6,
};

/** Games per pool round; a round is complete when this many of its games are final. */
export const GAMES_PER_ROUND = [0, 32, 16, 8, 4, 2, 1];

export interface EspnCompetitor {
  espnId: string | null; // null while the opponent is still "TBD" (a First Four winner)
  name: string;
  seed: number | null;
  score: number | null;
  winner: boolean;
}

export interface EspnGame {
  espnId: string;
  round: number;
  region: Region | null;
  startAt: string; // ISO
  state: "pre" | "in" | "post";
  detail: string; // "Final", "2nd Half - 5:32", "Thu, March 19th at 12:15 PM EDT"
  competitors: [EspnCompetitor, EspnCompetitor];
}

/* eslint-disable @typescript-eslint/no-explicit-any -- ESPN payloads are untyped JSON */
export function parseScoreboard(json: any): EspnGame[] {
  const games: EspnGame[] = [];
  for (const event of json?.events ?? []) {
    const comp = event.competitions?.[0];
    const headline: string = comp?.notes?.find((n: any) => n.headline)?.headline ?? "";
    if (!headline.startsWith(HEADLINE_PREFIX)) continue;
    const label = Object.keys(ROUND_BY_LABEL).find((l) => headline.endsWith(l));
    if (label === undefined) continue;
    const regionMatch = headline.match(/(East|West|South|Midwest) Region/);
    const competitors = (comp.competitors ?? []).map((c: any): EspnCompetitor => {
      const id = c.team?.id;
      const tbd = !id || Number(id) < 0 || /^tbd$/i.test(c.team?.displayName ?? "");
      const seed = Number(c.curatedRank?.current);
      return {
        espnId: tbd ? null : String(id),
        name: tbd ? "TBD" : (c.team.location ?? c.team.displayName),
        seed: seed >= 1 && seed <= 16 ? seed : null,
        score: c.score === undefined || c.score === "" ? null : Number(c.score),
        winner: c.winner === true,
      };
    });
    if (competitors.length !== 2) continue;
    games.push({
      espnId: String(event.id),
      round: ROUND_BY_LABEL[label],
      region: regionMatch ? (regionMatch[1] as Region) : null,
      startAt: comp.startDate ?? comp.date ?? event.date,
      state: comp.status?.type?.state ?? "pre",
      detail: comp.status?.type?.shortDetail ?? comp.status?.type?.detail ?? "",
      competitors: competitors as [EspnCompetitor, EspnCompetitor],
    });
  }
  return games;
}

/** Keeps only the fields parseScoreboard reads, for small test fixtures. */
export function stripScoreboard(json: any) {
  return {
    events: (json?.events ?? []).map((e: any) => {
      const c = e.competitions?.[0] ?? {};
      return {
        id: e.id,
        date: e.date,
        competitions: [
          {
            date: c.date,
            startDate: c.startDate,
            notes: c.notes,
            status: { type: c.status?.type && { state: c.status.type.state, shortDetail: c.status.type.shortDetail } },
            competitors: (c.competitors ?? []).map((x: any) => ({
              score: x.score,
              winner: x.winner,
              curatedRank: x.curatedRank,
              team: x.team && { id: x.team.id, location: x.team.location, displayName: x.team.displayName },
            })),
          },
        ],
      };
    }),
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** ESPN's `dates` parameter is a US Eastern calendar day, YYYYMMDD. */
export function easternDay(d: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
  return parts.replaceAll("-", "");
}

export function addDays(day: string, n: number): string {
  const d = new Date(Date.UTC(+day.slice(0, 4), +day.slice(4, 6) - 1, +day.slice(6, 8) + n));
  return d.toISOString().slice(0, 10).replaceAll("-", "");
}

export async function fetchDay(day: string): Promise<EspnGame[]> {
  const res = await fetch(`${SCOREBOARD}?dates=${day}&groups=100&limit=200`, { cache: "no-store" });
  if (!res.ok) throw new Error(`ESPN scoreboard ${day}: HTTP ${res.status}`);
  return parseScoreboard(await res.json());
}

export interface BracketSlot {
  id: string;
  region: Region;
  seed: number;
  name: string;
  /** One ESPN team id, or two for a First Four pair. */
  espnIds: string[];
}

/**
 * Builds the 64 pool slots from the First Four and Round of 64 games. A First Four pair becomes
 * one slot ("Texas / NC State") holding both ESPN ids, whether or not that game has been played.
 */
export function buildBracket(games: EspnGame[]): BracketSlot[] {
  const slots = new Map<string, BracketSlot>();
  const key = (region: Region, seed: number) => `${region.toLowerCase()}-${seed}`;

  for (const g of games.filter((g) => g.round === 0 && g.region)) {
    const [a, b] = g.competitors;
    const seed = a.seed ?? b.seed;
    if (!seed) throw new Error(`First Four game ${g.espnId} has no seed`);
    slots.set(key(g.region!, seed), {
      id: key(g.region!, seed),
      region: g.region!,
      seed,
      name: `${a.name} / ${b.name}`,
      espnIds: [a.espnId, b.espnId].filter((x): x is string => x !== null),
    });
  }

  for (const g of games.filter((g) => g.round === 1)) {
    if (!g.region) throw new Error(`Round of 64 game ${g.espnId} has no region`);
    const seeds = g.competitors.map((c) => c.seed);
    // A TBD opponent may come without a seed; R64 matchups always add up to 17.
    for (const [i, c] of g.competitors.entries()) {
      const seed = c.seed ?? (seeds[1 - i] ? 17 - seeds[1 - i]! : null);
      if (!seed) throw new Error(`Round of 64 game ${g.espnId} has no seeds`);
      const id = key(g.region, seed);
      if (slots.has(id)) continue; // First Four slot already built
      if (!c.espnId) throw new Error(`${g.region} ${seed} seed is TBD but no First Four game was found`);
      slots.set(id, { id, region: g.region, seed, name: c.name, espnIds: [c.espnId] });
    }
  }

  const list = [...slots.values()];
  for (const region of REGIONS) {
    const seeds = list.filter((s) => s.region === region).map((s) => s.seed).sort((a, b) => a - b);
    if (seeds.length !== 16 || seeds.some((s, i) => s !== i + 1)) {
      throw new Error(`${region} region is incomplete: found seeds ${seeds.join(", ") || "none"}`);
    }
  }
  return list.sort((a, b) => REGIONS.indexOf(a.region) - REGIONS.indexOf(b.region) || a.seed - b.seed);
}
