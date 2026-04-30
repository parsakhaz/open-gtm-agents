import http from "node:http";
import type {
  BrowserCommand,
  BrowserConnectionStatus,
  CommandResult,
} from "../src/lib/browser-relay/types";
import { debugLog, durationMs, previewForLog } from "../src/lib/debug-log";
import type { CdpCommands } from "./cdp-commands";

const DEFAULT_PORT = 4123;

export class LocalRelayServer {
  private server: http.Server | null = null;

  constructor(
    private getCommands: () => CdpCommands | null,
    private getStatus: () => BrowserConnectionStatus,
    private port = Number(process.env.BROWSER_RELAY_PORT || DEFAULT_PORT),
  ) {}

  start() {
    if (this.server) return;

    this.server = http.createServer((request, response) => {
      void this.handle(request, response);
    });
    this.server.listen(this.port, "127.0.0.1", () => {
      console.log(`[BrowserRelay] Listening on http://127.0.0.1:${this.port}`);
    });
  }

  stop() {
    this.server?.close();
    this.server = null;
  }

  private async handle(request: http.IncomingMessage, response: http.ServerResponse) {
    setCorsHeaders(response);

    if (request.method === "OPTIONS") {
      response.writeHead(204);
      response.end();
      return;
    }

    if (request.method === "GET" && request.url === "/status") {
      debugLog("desktop-relay", "status request", this.getStatus());
      sendJson(response, 200, this.getStatus());
      return;
    }

    if (request.method === "POST" && request.url === "/command") {
      const commands = this.getCommands();
      if (!commands) {
        sendJson(response, 503, {
          ok: false,
          error: "Chrome/Edge CDP is not connected.",
        } satisfies CommandResult);
        return;
      }

      try {
        const startedAt = Date.now();
        const body = await readJson(request);
        const command = (body as { command?: BrowserCommand }).command;
        if (!command?.name) {
          sendJson(response, 400, { ok: false, error: "command is required." });
          return;
        }

        debugLog("desktop-relay", "command received", {
          name: command.name,
          command: previewForLog(command),
        });
        const result = await commands.execute(command);
        debugLog("desktop-relay", "command completed", {
          name: command.name,
          ok: result.ok,
          durationMs: durationMs(startedAt),
          result: previewForLog(result.result ?? result.error),
        }, result.ok ? "info" : "warn");
        sendJson(response, 200, result);
      } catch (error) {
        debugLog("desktop-relay", "command failed", {
          error: error instanceof Error ? error.message : String(error),
        }, "error");
        sendJson(response, 500, {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
      return;
    }

    sendJson(response, 404, { error: "Not found." });
  }
}

function setCorsHeaders(response: http.ServerResponse) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function sendJson(response: http.ServerResponse, status: number, value: unknown) {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(value));
}

async function readJson(request: http.IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : {};
}
