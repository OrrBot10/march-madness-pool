// Applies drizzle/ migrations to the hosted database before each production build.
// Does nothing without DATABASE_URL (local runs migrate the embedded database on startup).
import path from "node:path";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.log("migrate: no DATABASE_URL, skipping");
    return;
  }
  const client = postgres(url, { prepare: false, max: 1 });
  await migrate(drizzle(client), { migrationsFolder: path.join(import.meta.dirname, "..", "drizzle") });
  await client.end();
  console.log("migrate: database is up to date");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
