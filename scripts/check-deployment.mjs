import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const env = fileURLToPath(new URL(".env", root));
if (existsSync(env)) process.loadEnvFile(env);
const production =
  process.argv.includes("--production") ||
  process.env.NODE_ENV === "production";
if (!production) {
  process.env.CONTENT_SERVICE_URL ??= "http://127.0.0.1:4001";
  process.env.ANALYTICS_SERVICE_URL ??= "http://127.0.0.1:4002";
  process.env.IDENTITY_SERVICE_URL ??= "http://127.0.0.1:4003";
  process.env.ACADEMIC_SERVICE_URL ??= "http://127.0.0.1:4004";
}
const errors = [];
const warnings = [];
const required = [
  "APP_URL",
  "API_URL",
  "DATABASE_URL",
  "REDIS_URL",
  "CONTENT_SERVICE_URL",
  "ANALYTICS_SERVICE_URL",
  "INTERNAL_SERVICE_TOKEN",
  "IDENTITY_SERVICE_URL",
  "ACADEMIC_SERVICE_URL",
];
for (const key of required)
  if (!process.env[key]?.trim()) errors.push(`Falta ${key}.`);
const local = (hostname) =>
  ["localhost", "127.0.0.1", "[::1]"].includes(hostname);
for (const key of [
  "APP_URL",
  "API_URL",
  "CONTENT_SERVICE_URL",
  "ANALYTICS_SERVICE_URL",
  "IDENTITY_SERVICE_URL",
  "ACADEMIC_SERVICE_URL",
  "DATABASE_URL",
  "REDIS_URL",
]) {
  const value = process.env[key];
  if (!value) continue;
  try {
    const url = new URL(value);
    const allowed =
      key === "DATABASE_URL"
        ? ["postgres:", "postgresql:"]
        : key === "REDIS_URL"
          ? ["redis:", "rediss:"]
          : ["http:", "https:"];
    if (!allowed.includes(url.protocol))
      errors.push(`Protocolo no válido en ${key}.`);
    if (allowed.includes("https:")) {
      if (
        url.username ||
        url.password ||
        url.search ||
        url.hash ||
        (url.pathname !== "/" && url.pathname !== "")
      )
        errors.push(
          `${key} debe ser un origen sin credenciales, rutas ni parámetros.`,
        );
      if (!local(url.hostname) && url.protocol !== "https:")
        errors.push(`${key} remoto requiere HTTPS.`);
    }
    if (
      production &&
      key === "APP_URL" &&
      (url.protocol !== "https:" || local(url.hostname))
    )
      errors.push("APP_URL debe ser el origen HTTPS público en producción.");
  } catch {
    errors.push(`${key} no contiene una URL válida.`);
  }
}
if ((process.env.INTERNAL_SERVICE_TOKEN?.length ?? 0) < 32)
  errors.push("INTERNAL_SERVICE_TOKEN debe tener al menos 32 caracteres.");
const pool = Number(process.env.DATABASE_POOL_MAX ?? 10);
if (!Number.isInteger(pool) || pool < 1 || pool > 100)
  errors.push("DATABASE_POOL_MAX debe estar entre 1 y 100.");
if (!process.env.PAYMENT_INSTRUCTIONS?.trim())
  warnings.push(
    "Pagos deshabilitados: falta PAYMENT_INSTRUCTIONS con los datos bancarios verificados.",
  );
if (production && process.env.NODE_ENV !== "production")
  errors.push("NODE_ENV debe ser production.");
if (production && process.env.SWAGGER_ORIGIN)
  warnings.push(
    "SWAGGER_ORIGIN se ignora en producción; usa Swagger bajo el mismo origen de APP_URL.",
  );
const [major, minor] = process.versions.node.split(".").map(Number);
if (major !== 24 || minor < 15)
  errors.push("Usa Node 24.15 o posterior de la rama 24, según package.json.");
for (const path of [
  "pnpm-lock.yaml",
  "apps/web/src/shared/fonts/Inter.ttf",
  "apps/web/src/shared/fonts/Montserrat.ttf",
])
  if (!existsSync(new URL(path, root)))
    errors.push(`Falta el archivo requerido: ${path}.`);
for (const message of warnings) console.warn(`AVISO: ${message}`);
for (const message of errors) console.error(`ERROR: ${message}`);
if (errors.length) process.exitCode = 1;
else
  console.log(
    `Configuración estática válida. Pool máximo por proceso: ${pool}. No se probaron conexiones, migraciones, DNS ni carga.`,
  );
