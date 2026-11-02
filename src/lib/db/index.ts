import { PGlite } from "@electric-sql/pglite";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { HistoryYear } from "@/lib/pool/history";
import * as schema from "./schema";

type DB = PgliteDatabase<typeof schema>;

const globalForDb = globalThis as unknown as { poolDb?: Promise<DB> };

/** Local embedded Postgres, stored in .data/. Production will point Drizzle at a hosted Postgres instead. */
export function getDb(): Promise<DB> {
  globalForDb.poolDb ??= open();
  return globalForDb.poolDb;
}

async function open(): Promise<DB> {
  const dataDir = path.join(process.cwd(), ".data", "pglite");
  mkdirSync(dataDir, { recursive: true });
  const client = new PGlite(dataDir);
  await client.exec(schema.BOOTSTRAP_SQL);
  const db = drizzle(client, { schema });
  await seedDemoSeason(db);
  return db;
}

/**
 * Until the ESPN bracket import exists, the local app runs a demo 2027 season on the 2026 bracket,
 * open for picks, with last year's entries pre-loaded so the shared views have something to show.
 */
async function seedDemoSeason(db: DB) {
  const existing = await db.select().from(schema.seasons).limit(1);
  if (existing.length > 0) return;

  const last: HistoryYear = JSON.parse(
    readFileSync(path.join(process.cwd(), "data", "history", "2026.json"), "utf8"),
  );
  const year = 2027;
  await db.insert(schema.seasons).values({ year, status: "open", lockAt: new Date("2027-03-18T16:15:00Z") });
  await db
    .insert(schema.teams)
    .values(last.teams.map((t) => ({ year, id: t.id, region: t.region, seed: t.seed, name: t.name })));
  for (const e of last.entries) {
    const [row] = await db
      .insert(schema.entries)
      .values({ year, name: e.name, entryFee: e.entryFee })
      .returning({ id: schema.entries.id });
    const rows = Object.entries(e.picks).map(([teamId, shares]) => ({ entryId: row.id, teamId, shares }));
    if (rows.length) await db.insert(schema.picks).values(rows);
  }
}
