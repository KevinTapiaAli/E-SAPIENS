import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const env = fileURLToPath(new URL(".env", root));
if (existsSync(env)) process.loadEnvFile(env);
const require = createRequire(new URL("apps/api/package.json", root));
const { Client } = require("pg");
if (!process.env.DATABASE_URL) throw new Error("Falta DATABASE_URL.");
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 3000,
  statement_timeout: 30000,
});
try {
  await client.connect();
  await client.query("BEGIN");
  await client.query("SELECT pg_advisory_xact_lock(712410)");
  const schema = await client.query(
    "SELECT to_regclass('lms.usuarios') IS NOT NULL AS ready",
  );
  if (!schema.rows[0].ready)
    throw new Error(
      "Falta el esquema inicial. db:init solo corresponde a una base local vacía.",
    );
  await client.query(
    "CREATE TABLE IF NOT EXISTS lms.schema_migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())",
  );
  const dir = new URL("database/migrations/", root);
  for (const name of readdirSync(dir)
    .filter((name) => /^\d{4}_.*\.sql$/.test(name) && !name.startsWith("0001_"))
    .sort()) {
    const sql = readFileSync(new URL(name, dir), "utf8").replace(/\r\n/g, "\n");
    const checksum = createHash("sha256").update(sql).digest("hex");
    const previous = await client.query(
      "SELECT checksum FROM lms.schema_migrations WHERE name=$1",
      [name],
    );
    if (previous.rowCount) {
      if (previous.rows[0].checksum !== checksum)
        throw new Error(`Migración aplicada modificada: ${name}`);
      continue;
    }
    await client.query(sql);
    await client.query(
      "INSERT INTO lms.schema_migrations(name,checksum) VALUES($1,$2)",
      [name, checksum],
    );
    console.log(`Aplicada: ${name}`);
  }
  await client.query("COMMIT");
  console.log(
    "Migraciones incrementales verificadas. Datos existentes conservados.",
  );
} catch (error) {
  await client.query("ROLLBACK").catch(() => undefined);
  throw error;
} finally {
  await client.end();
}
