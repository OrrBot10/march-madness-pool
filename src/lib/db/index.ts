import { PGlite } from "@electric-sql/pglite";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { mkdirSync } from "node:fs";
import path from "node:path";
import * as schema from "./schema";

export type DB = PgliteDatabase<typeof schema>;

const globalForDb = globalThis as unknown as { poolDb?: Promise<DB> };

/** Local embedded Postgres, stored in .data/. Production will point Drizzle at a hosted Postgres instead. */
export function getDb(): Promise<DB> {
  globalForDb.poolDb ??= open();
  return globalForDb.poolDb;
}

async function open(): Promise<DB> {
  const dataDir = path.join(process.cwd(), ".data", "pglite");
  mkdirSync(dataDir, { recursive: true });
  const db = drizzle(new PGlite(dataDir), { schema });
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  const { seedLocalSeasons } = await import("./seed");
  await seedLocalSeasons(db);
  return db;
}
