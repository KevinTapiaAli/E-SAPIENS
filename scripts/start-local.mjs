import { randomBytes } from "node:crypto";
import {
  readFileSync,
  writeFileSync,
  constants,
  copyFileSync,
  existsSync,
} from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
process.chdir(root);

function prepareEnvironment(target, example) {
  if (!existsSync(target)) {
    copyFileSync(example, target, constants.COPYFILE_EXCL);
    console.log(`Creado ${target} desde su plantilla local.`);
  }
}

function run(command, args, label) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      stdio: "inherit",
      shell: false,
    });
    child.once("error", () =>
      reject(
        new Error(
          `No se pudo iniciar ${command === process.execPath ? "pnpm" : command}. Revisa su instalación.`,
        ),
      ),
    );
    child.once("exit", (code, signal) => {
      if (code === 0) resolve();
      else
        reject(
          new Error(
            `El paso ${label} se detuvo (${signal ?? code}). No se ejecutarán los siguientes pasos.${label === "infra:up" ? " Abre Docker Desktop y espera a que esté listo." : ""}`,
          ),
        );
    });
  });
}

try {
  const flags = new Set(process.argv.slice(2));
  if ([...flags].some((flag) => !["--demo", "--prepare-only"].includes(flag)))
    throw new Error("Opciones admitidas: --demo --prepare-only.");
  if (!existsSync("node_modules"))
    throw new Error(
      "Instala las dependencias primero: pnpm.cmd install --frozen-lockfile",
    );
  if (
    !process.env.npm_execpath?.endsWith(".cjs") &&
    !process.env.npm_execpath?.endsWith(".js")
  )
    throw new Error("Ejecuta este script mediante pnpm.cmd dev.");
  prepareEnvironment(".env", ".env.example");
  prepareEnvironment("apps/web/.env.local", "apps/web/.env.example");
  process.loadEnvFile(".env");
  if (process.env.APP_ENV !== "local" || process.env.NODE_ENV === "production")
    throw new Error(
      "El arranque local requiere APP_ENV=local y NODE_ENV distinto de production.",
    );
  for (const name of ["DATABASE_URL", "REDIS_URL", "API_URL", "APP_URL"]) {
    let url;
    try {
      url = new URL(process.env[name]);
    } catch {
      throw new Error(`Falta una URL válida en ${name}. Revisa .env.`);
    }
    if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))
      throw new Error(
        `El arranque local solo admite servicios locales en ${name}.`,
      );
  }
  if (!process.env.INTERNAL_SERVICE_TOKEN) {
    const token = randomBytes(32).toString("hex");
    const existing = readFileSync(".env", "utf8");
    const line = "INTERNAL_SERVICE_TOKEN=" + token;
    writeFileSync(
      ".env",
      /^INTERNAL_SERVICE_TOKEN=.*$/m.test(existing)
        ? existing.replace(/^INTERNAL_SERVICE_TOKEN=.*$/m, line)
        : existing + "\n" + line + "\n",
    );
    process.env.INTERNAL_SERVICE_TOKEN = token;
    console.log("Clave interna generada en .env (no se publica en Git).");
  }
  if (process.env.INTERNAL_SERVICE_TOKEN.length < 32) {
    throw new Error(
      "INTERNAL_SERVICE_TOKEN debe tener al menos 32 caracteres.",
    );
  }
  const pnpm = (script) =>
    run(process.execPath, [process.env.npm_execpath, script], script);
  console.log(
    "1/3 · Preparando PostgreSQL y Redis. Docker Desktop debe estar abierto.",
  );
  await pnpm("infra:up");
  console.log(
    "2/3 · Aplicando migraciones y conservando los datos existentes.",
  );
  await pnpm("db:prepare");
  if (flags.has("--demo")) {
    console.log("Preparando materias, biblioteca y lecturas de demostración.");
    await pnpm("db:seed:demo");
    await pnpm("db:seed:classroom");
  }
  if (flags.has("--prepare-only")) {
    console.log(
      "Preparación completada. Crea tus cuentas con pnpm account:create y luego inicia con pnpm dev.",
    );
  } else {
    console.log(
      "3/3 · Iniciando web, API, contenido y analítica. Mantén esta terminal abierta; usa Ctrl+C para detenerlas.",
    );
    // Separar el supervisor evita invocar este preparador de forma recursiva.
    await pnpm("dev:apps");
  }
} catch (error) {
  console.error(
    error instanceof Error
      ? error.message
      : "No se pudo iniciar el entorno local.",
  );
  process.exitCode = 1;
}
