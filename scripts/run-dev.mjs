#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import net from "node:net";
import process from "node:process";

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const host = args.host ?? "127.0.0.1";
const shouldStartDesktop = args.desktop !== "false";

await ensureEnv(args);
loadEnvFiles();
if (args.killExisting !== "false") {
  killExistingNextDev();
}

const port = await resolvePort(args.port ?? process.env.PORT ?? "3000", host, "web");
const relayPort = await resolvePort(
  args.relayPort ?? process.env.BROWSER_RELAY_PORT ?? "4123",
  "127.0.0.1",
  "browser relay",
);
const relayUrl = process.env.BROWSER_RELAY_URL ?? `http://127.0.0.1:${relayPort}`;

const children = [];

start(
  "web",
  process.execPath,
  [
    localBin("next", "dist/bin/next"),
    "dev",
    "--hostname",
    host,
    "--port",
    port,
  ],
  { BROWSER_RELAY_URL: relayUrl },
);

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
console.log(`Browser relay:   ${relayUrl}`);
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

function loadEnvFiles() {
  const loaded = [];
  for (const file of [".env", ".env.local"]) {
    const fullPath = path.join(root, file);
    if (!existsSync(fullPath)) continue;
    loadEnvFile(fullPath);
    loaded.push(file);
  }

  if (loaded.length > 0) {
    console.log(`[env] loaded ${loaded.join(", ")}`);
  }
}

function loadEnvFile(filePath) {
  const text = readFileSync(filePath, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const index = line.indexOf("=");
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();

    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
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

function killExistingNextDev() {
  if (process.platform === "win32") {
    const psScript = `
$root = ${JSON.stringify(root)}
$currentPid = $PID
Get-CimInstance Win32_Process |
  Where-Object {
    $_.ProcessId -ne $currentPid -and
    $_.CommandLine -and
    $_.CommandLine.Contains($root) -and
    (
      $_.CommandLine.Contains('node_modules\\next\\dist\\bin\\next') -or
      $_.CommandLine.Contains('node_modules\\next\\dist\\server\\lib\\start-server') -or
      $_.CommandLine.Contains('.next\\dev\\build')
    )
  } |
  ForEach-Object {
    Write-Output "[dev] stopping existing Next dev PID $($_.ProcessId)"
    Stop-Process -Id $_.ProcessId -Force
  }
`;
    const result = spawnSync(
      "powershell.exe",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", psScript],
      { cwd: root, encoding: "utf8" },
    );
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    return;
  }

  const result = spawnSync("ps", ["-eo", "pid=,args="], {
    cwd: root,
    encoding: "utf8",
  });
  if (result.error || !result.stdout) return;

  for (const line of result.stdout.split(/\r?\n/)) {
    if (
      !line.includes(root) ||
      !/node_modules\/next\/dist\/bin\/next|node_modules\/next\/dist\/server\/lib\/start-server|\.next\/dev\/build/.test(line)
    ) {
      continue;
    }

    const match = line.trim().match(/^(\d+)/);
    const pid = match ? Number(match[1]) : 0;
    if (!pid || pid === process.pid) continue;

    try {
      process.kill(pid, "SIGTERM");
      console.log(`[dev] stopping existing Next dev PID ${pid}`);
    } catch {
      // Ignore stale process table entries.
    }
  }
}

function localBin(packageName, relativeBin) {
  return path.join(root, "node_modules", packageName, relativeBin);
}

async function resolvePort(preferredPort, bindHost, label) {
  const startPort = Number(preferredPort);
  if (!Number.isInteger(startPort) || startPort <= 0) {
    throw new Error(`${label} port must be a positive integer.`);
  }

  for (let candidate = startPort; candidate < startPort + 20; candidate += 1) {
    if (await isPortAvailable(candidate, bindHost)) {
      if (candidate !== startPort) {
        console.log(`[dev] ${label} port ${startPort} is busy; using ${candidate}.`);
      }
      return String(candidate);
    }
  }

  throw new Error(`No available ${label} port found from ${startPort} to ${startPort + 19}.`);
}

function isPortAvailable(port, bindHost) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, bindHost);
  });
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
