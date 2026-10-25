import { spawn, execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const cwd = fileURLToPath(new URL("../apps/api/", import.meta.url));
const production = process.argv.includes("--production");
const children = [];
let stopping = false;

function stop(code) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of children) {
    if (!child.pid || child.exitCode !== null) continue;
    if (process.platform === "win32") {
      try {
        execFileSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
          stdio: "ignore",
          windowsHide: true,
        });
      } catch {
        /* The child may already have exited. */
      }
    } else {
      try {
        process.kill(-child.pid, "SIGTERM");
      } catch {
        /* Already stopped. */
      }
    }
  }
}

for (const name of ["content-main", "analytics-main", "main"]) {
  const args = production
    ? [`dist/${name}.js`]
    : ["--watch", "-r", "ts-node/register", `src/${name}.ts`];
  const child = spawn(process.execPath, args, {
    cwd,
    stdio: "inherit",
    shell: false,
    detached: process.platform !== "win32",
    env: {
      ...process.env,
      SERVICE_NAME: name,
      ...(production ? { NODE_ENV: "production" } : {}),
    },
  });
  children.push(child);
  child.once("error", (error) => {
    console.error(`${name}: ${error.message}`);
    stop(1);
  });
  child.once("exit", (code) => {
    if (!stopping) stop(code || 1);
  });
}
process.once("SIGINT", () => stop(0));
process.once("SIGTERM", () => stop(0));
