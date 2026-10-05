import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const envPath = fileURLToPath(new URL(".env", root));
if (existsSync(envPath)) process.loadEnvFile(envPath);
const require = createRequire(new URL("apps/api/package.json", root));
const { Client } = require("pg");
const command = process.argv[2];
if (!["check", "init", "seed-demo", "seed-classroom"].includes(command))
  throw new Error("Uso: database.mjs check|init|seed-demo|seed-classroom");
if (!process.env.DATABASE_URL)
  throw new Error("Falta DATABASE_URL. Revisa .env.example.");

const url = new URL(process.env.DATABASE_URL);
if (command !== "check") {
  if (
    process.env.NODE_ENV === "production" ||
    !["local", "test"].includes(process.env.APP_ENV)
  ) {
    throw new Error(
      "La inicialización y el seed exigen APP_ENV=local o test y NODE_ENV distinto de production.",
    );
  }
  if (
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
    !["/esapiens", "/esapiens_test"].includes(url.pathname)
  ) {
    throw new Error(
      "Este comando solo admite esapiens o esapiens_test en PostgreSQL local.",
    );
  }
}

const client = new Client({
  connectionString: url.toString(),
  connectionTimeoutMillis: 3000,
  statement_timeout: 30000,
});
try {
  await client.connect();
  if (command === "init") {
    await client.query("SELECT pg_advisory_lock(712410)");
    const existing = await client.query(
      "SELECT to_regnamespace('lms') IS NOT NULL AS exists",
    );
    if (existing.rows[0].exists)
      throw new Error(
        "El esquema lms ya existe. Se conserva sin cambios. Utiliza db:check.",
      );
    // La migración original incluye su propia transacción; no se modifica ni se vuelve a aplicar.
    await client.query(
      readFileSync(
        new URL("database/migrations/0001_initial_schema.sql", root),
        "utf8",
      ),
    );
    console.log("Esquema inicial instalado en la base local vacía.");
  } else if (command === "seed-demo" || command === "seed-classroom") {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(712410)");
    await client.query("SET LOCAL app.allow_demo_seed = 'enabled'");
    await client.query(
      readFileSync(
        new URL(
          command === "seed-demo"
            ? "database/seeds/demo.sql"
            : "database/seeds/classroom-demo.sql",
          root,
        ),
        "utf8",
      ),
    );
    await client.query("COMMIT");
    console.log(
      command === "seed-demo"
        ? "Contenido de demostración disponible. Los registros existentes no se sobrescribieron."
        : "Lecturas demo preparadas. Se conservaron los textos no vacíos y las reglas ya existentes.",
    );
  }
  const result = await client.query(`SELECT
    (SELECT count(*)::int FROM pg_tables WHERE schemaname='lms') AS tables,
    (SELECT count(*)::int FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='lms') AS functions,
    (SELECT count(*)::int FROM lms.cursos WHERE estado='publicado') AS published_courses,
    (SELECT count(*)::int FROM lms.biblioteca_items WHERE publicado AND ficha_publica) AS public_library_items`);
  console.log(JSON.stringify(result.rows[0], null, 2));
} catch (error) {
  await client.query("ROLLBACK").catch(() => {});
  console.error(
    error instanceof Error
      ? error.message
      : "No se pudo completar la operación.",
  );
  process.exitCode = 1;
} finally {
  await client.end();
}
