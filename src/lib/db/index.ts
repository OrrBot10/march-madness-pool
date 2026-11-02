import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

export type DB = PgDatabase<PgQueryResultHKT, typeof schema>;

const globalForDb = globalThis as unknown as { poolDb?: Promise<DB> };

/**
 * Production: the hosted Postgres in DATABASE_URL (migrations run at build time, see scripts/migrate.ts).
 * Local: an embedded Postgres in .data/, migrated and filled with test seasons on first open.
 */
export function getDb(): Promise<DB> {
  globalForDb.poolDb ??= process.env.DATABASE_URL ? openHosted(process.env.DATABASE_URL) : openLocal();
  return globalForDb.poolDb;
}

async function openHosted(url: string): Promise<DB> {
  const { default: postgres } = await import("postgres");
  const { drizzle } = await import("drizzle-orm/postgres-js");
  // Supabase's transaction pooler doesn't support prepared statements.
  const client = postgres(url, { prepare: false, max: 5 });
  return drizzle(client, { schema }) as unknown as DB;
}

async function openLocal(): Promise<DB> {
  const [{ PGlite }, { drizzle }, { migrate }, { mkdirSync }, path] = await Promise.all([
    import("@electric-sql/pglite"),
    import("drizzle-orm/pglite"),
    import("drizzle-orm/pglite/migrator"),
    import("node:fs"),
    import("node:path"),
  ]);
  const dataDir = path.join(process.cwd(), ".data", "pglite");
  mkdirSync(dataDir, { recursive: true });
  const db = drizzle(new PGlite(dataDir), { schema });
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  const { seedLocalSeasons } = await import("./seed");
  await seedLocalSeasons(db as unknown as DB);
  return db as unknown as DB;
}
