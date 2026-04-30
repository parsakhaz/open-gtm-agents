#!/usr/bin/env node
import { existsSync } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import process from "node:process";

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const host = args.host ?? "127.0.0.1";
const port = args.port ?? "3000";
const relayPort = args.relayPort ?? process.env.BROWSER_RELAY_PORT ?? "4123";
const shouldStartDesktop = args.desktop !== "false";

await ensureEnv(args);

const children = [];

start("web", process.execPath, [
  localBin("next", "dist/bin/next"),
  "dev",
  "--hostname",
  host,
  "--port",
  port,
]);

if (shouldStartDesktop) {
  start(
    "browser",
    process.execPath,
    [localBin("electron", "cli.js"), "desktop/electron-bootstrap.cjs"],
    { BROWSER_RELAY_PORT: relayPort },
  );
}

console.log("");
console.log(`Open GTM Agents: http://${host}:${port}`);
console.log(`Browser relay:   http://127.0.0.1:${relayPort}`);
console.log(`Env source:       ${existsSync(path.join(root, ".env.local")) ? ".env.local" : "process env"}`);
console.log(`Browser model:    ${process.env.OPENAI_MODEL || "gpt-5.4-mini"} (reasoning high)`);
console.log(`Orchestrator:     ${process.env.OPENAI_HIGH_QUALITY_MODEL || "gpt-5.5"}`);
console.log("Press Ctrl+C to stop all local processes.");

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => shutdown(signal));
}

process.on("exit", () => {
  for (const child of children) {
    if (!child.killed) child.kill();
  }
});

let shuttingDown = false;

function start(label, command, commandArgs, extraEnv = {}) {
  const child = spawn(command, commandArgs, {
    cwd: root,
    env: { ...process.env, ...extraEnv },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: false,
  });

  children.push(child);

  child.stdout.on("data", (chunk) => prefix(label, chunk));
  child.stderr.on("data", (chunk) => prefix(label, chunk));
  child.on("exit", (code, signal) => {
    if (shuttingDown) return;
    console.log(`[${label}] exited${signal ? ` via ${signal}` : ` with code ${code}`}`);
    shutdown("child-exit");
  });
}

function shutdown(reason) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\nStopping local dev processes (${reason})...`);

  for (const child of children) {
    if (!child.killed) child.kill();
  }

  setTimeout(() => process.exit(0), 500).unref();
}

function prefix(label, chunk) {
  for (const line of chunk.toString().split(/\r?\n/)) {
    if (line.trim()) console.log(`[${label}] ${line}`);
  }
}

async function ensureEnv(options) {
  if (options.env === "false") return;
  if (existsSync(path.join(root, ".env.local")) && options.env !== "pull") return;

  if (!existsSync(path.join(root, ".vercel"))) {
    const project = options.vercelProject ?? process.env.VERCEL_PROJECT;
    const scope = options.vercelScope ?? process.env.VERCEL_SCOPE;

    if (project) {
      await runOptional("env", [
        "vercel",
        "link",
        "--project",
        project,
        ...(scope ? ["--scope", scope] : []),
        "--yes",
      ]);
    } else {
      console.log("[env] .vercel is missing; skipping automatic link. Set VERCEL_PROJECT or run `npx vercel link --yes`.");
    }
  }

  await runOptional("env", [
    "vercel",
    "env",
    "pull",
    ".env.local",
    "--environment=development",
    "--yes",
  ]);
}

function runOptional(label, commandArgs) {
  return new Promise((resolve) => {
    const command = process.platform === "win32" ? "npx.cmd" : "npx";
    const child = spawn(command, commandArgs, {
      cwd: root,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: false,
    });

    child.stdout.on("data", (chunk) => prefix(label, chunk));
    child.stderr.on("data", (chunk) => prefix(label, chunk));
    child.on("exit", (code) => {
      if (code !== 0) {
        console.log("[env] Vercel env pull did not complete. Continuing with the current local environment.");
      }
      resolve();
    });
  });
}

function localBin(packageName, relativeBin) {
  return path.join(root, "node_modules", packageName, relativeBin);
}

function parseArgs(values) {
  const parsed = {};

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!value.startsWith("--")) continue;

    const [rawKey, inlineValue] = value.slice(2).split("=", 2);
    const key = rawKey.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
    parsed[key] = inlineValue ?? values[index + 1] ?? "true";

    if (inlineValue === undefined && values[index + 1] && !values[index + 1].startsWith("--")) {
      index += 1;
    }
  }

  return parsed;
}
