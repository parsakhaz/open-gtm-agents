import net from "node:net";
import os from "node:os";
import process from "node:process";
import { spawnSync } from "node:child_process";
import WebSocket from "ws";

const port = Number(process.env.CDP_PORT || process.argv[2] || 9222);
const host = process.env.CDP_HOST || null;
const wsPath = process.env.CDP_WS_PATH || "/devtools/browser";
const timeoutMs = Number(process.env.CDP_TIMEOUT_MS || 5 * 60_000);

function log(message, extra) {
  const at = new Date().toISOString();
  if (extra === undefined) {
    console.log(`[${at}] ${message}`);
    return;
  }
  console.log(`[${at}] ${message}`, extra);
}

async function tcpProbe(targetHost) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: targetHost, port });
    const timer = setTimeout(() => {
      socket.destroy();
      resolve({ ok: false, error: "TCP timeout" });
    }, 2_000);

    socket.once("connect", () => {
      clearTimeout(timer);
      socket.destroy();
      resolve({ ok: true });
    });

    socket.once("error", (error) => {
      clearTimeout(timer);
      resolve({ ok: false, error: error.message });
    });
  });
}

async function httpJson(targetHost, pathname) {
  const url = `http://${targetHost}:${port}${pathname}`;
  try {
    const response = await fetch(url);
    const text = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      url,
      body: text.slice(0, 1_000),
    };
  } catch (error) {
    return {
      ok: false,
      url,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function wsProbe(targetHost) {
  const url = `ws://${targetHost}:${port}${wsPath}`;
  log(`Opening WebSocket probe: ${url}`);
  log(`If Edge/Chrome shows an Allow debugging prompt, click Allow. Waiting ${Math.round(timeoutMs / 1000)}s.`);

  return new Promise((resolve) => {
    let settled = false;
    const ws = new WebSocket(url);
    const timer = setTimeout(() => done({ ok: false, error: "WebSocket timeout waiting for Browser.getVersion" }), timeoutMs);

    function done(result) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        ws.close();
      } catch {
        // ignore
      }
      resolve(result);
    }

    ws.on("open", () => {
      log("WebSocket opened; sending Browser.getVersion");
      ws.send(JSON.stringify({ id: 1, method: "Browser.getVersion" }));
    });

    ws.on("message", (data) => {
      const text = typeof data === "string" ? data : data.toString();
      log("WebSocket message", text.slice(0, 1_000));
      try {
        const parsed = JSON.parse(text);
        if (parsed.id === 1 && parsed.result) {
          done({ ok: true, result: parsed.result });
        }
      } catch (error) {
        done({ ok: false, error: `Could not parse WebSocket message: ${error.message}` });
      }
    });

    ws.on("error", (error) => {
      done({ ok: false, error: error.message });
    });

    ws.on("close", (code, reason) => {
      if (!settled) {
        done({
          ok: false,
          error: `WebSocket closed before version response: ${code} ${reason.toString()}`,
        });
      }
    });
  });
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function getCandidateHosts() {
  if (host) return [host];

  const candidates = ["127.0.0.1", "localhost", "host.docker.internal"];

  try {
    const gateway = awaitCommand("sh", ["-lc", "ip route | awk '/default/ {print $3; exit}'"]);
    candidates.push(gateway);
  } catch {
    // ignore
  }

  try {
    const resolver = awaitCommand("sh", ["-lc", "awk '/^nameserver/ {print $2; exit}' /etc/resolv.conf"]);
    candidates.push(resolver);
  } catch {
    // ignore
  }

  for (const entries of Object.values(os.networkInterfaces())) {
    for (const entry of entries || []) {
      if (entry.family === "IPv4" && !entry.internal) {
        candidates.push(entry.address);
      }
    }
  }

  return unique(candidates);
}

function awaitCommand(command, args) {
  const child = spawnSync(command, args, { encoding: "buffer" });
  if (child.status !== 0) return "";
  return child.stdout.toString().trim();
}

const hosts = getCandidateHosts();
log(`CDP debug probe starting for port ${port}`);
log("Candidate hosts", hosts);

let selectedHost = null;

for (const candidate of hosts) {
  const tcp = await tcpProbe(candidate);
  log(`TCP probe ${candidate}:${port}`, tcp);
  if (tcp.ok) {
    selectedHost = candidate;
    break;
  }
}

const probeHost = selectedHost || hosts[0];
log(`Using ${probeHost}:${port} for HTTP/WebSocket checks`);

const tcp = await tcpProbe(probeHost);

const version = await httpJson(probeHost, "/json/version");
log("HTTP /json/version", version);

const list = await httpJson(probeHost, "/json/list");
log("HTTP /json/list", list);

const ws = await wsProbe(probeHost);
log("WebSocket direct probe result", ws);

if (!tcp.ok) {
  log("Diagnosis: nothing is listening on the CDP port. The browser flag alone probably did not open port 9222, or the browser needs a full restart after enabling the flag.");
} else if (version.ok) {
  log("Diagnosis: HTTP CDP discovery works. The Electron companion should attach through /json/version.");
} else if (ws.ok) {
  log("Diagnosis: direct WebSocket CDP works. The Electron companion should attach after the consent prompt.");
} else {
  log("Diagnosis: something is listening, but it is not exposing the expected CDP HTTP or WebSocket endpoint.");
}
