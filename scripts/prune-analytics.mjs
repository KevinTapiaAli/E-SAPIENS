import { existsSync } from "node:fs";
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
  await client.query("SELECT pg_advisory_xact_lock(712411)");
  // Bounded batches keep each maintenance run short; schedule daily.
  const visits =
    await client.query(`DELETE FROM lms.web_visits_daily WHERE ctid IN (
    SELECT ctid FROM lms.web_visits_daily WHERE day < (now() AT TIME ZONE 'UTC')::date-190 LIMIT 10000)`);
  const accounts =
    await client.query(`UPDATE lms.usuarios SET web_visitor_hash=NULL WHERE id IN (
    SELECT id FROM lms.usuarios WHERE web_visitor_hash IS NOT NULL AND created_at < now()-interval '190 days' LIMIT 10000)`);
  const requests =
    await client.query(`UPDATE lms.solicitudes_inscripcion SET web_visitor_hash=NULL WHERE id IN (
    SELECT id FROM lms.solicitudes_inscripcion WHERE web_visitor_hash IS NOT NULL AND created_at < now()-interval '190 days' LIMIT 10000)`);
  await client.query("COMMIT");
  console.log(
    `Medición depurada: ${visits.rowCount} filas de visitas; ${accounts.rowCount + requests.rowCount} atribuciones retiradas. Los registros de negocio se conservan.`,
  );
} catch {
  await client.query("ROLLBACK").catch(() => undefined);
  console.error(
    "No se pudo depurar la medición. Comprueba la conexión y la migración 0008.",
  );
  process.exitCode = 1;
} finally {
  await client.end();
}
