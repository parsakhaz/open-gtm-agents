import { EventEmitter } from "node:events";
import WebSocket from "ws";

const DEFAULT_CDP_PORT = 9222;
const DEFAULT_POLL_INTERVAL_MS = 5_000;
const DISCONNECT_THRESHOLD = 2;

export type BrowserInfo = {
  browser: string;
  version: string;
};

export type CdpDetection = {
  mode: "http" | "websocket-direct";
  browserInfo: BrowserInfo;
  wsUrl: string;
};

export class CdpPoller extends EventEmitter {
  private interval: ReturnType<typeof setInterval> | null = null;
  private polling = false;
  private connected = false;
  private consecutiveFailures = 0;

  constructor(
    private cdpPort = DEFAULT_CDP_PORT,
    private pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
  ) {
    super();
  }

  start() {
    if (this.interval) return;
    void this.poll();
    this.interval = setInterval(() => void this.poll(), this.pollIntervalMs);
  }

  stop() {
    if (!this.interval) return;
    clearInterval(this.interval);
    this.interval = null;
    this.connected = false;
    this.consecutiveFailures = 0;
  }

  isPolling() {
    return this.interval !== null;
  }

  reset() {
    this.connected = false;
    this.consecutiveFailures = 0;
  }

  private async poll() {
    if (this.polling) return;
    this.polling = true;
    try {
      const httpDetection = await this.tryHttpDiscovery();
      if (httpDetection) {
        this.consecutiveFailures = 0;
        if (!this.connected) {
          this.connected = true;
          this.emit("connected", httpDetection);
        }
        return;
      }

      if (this.connected) return;

      const wsDetection = await this.tryWebSocketProbe();
      if (wsDetection) {
        this.consecutiveFailures = 0;
        this.connected = true;
        this.emit("connected", wsDetection);
        return;
      }

      this.consecutiveFailures += 1;
      if (this.consecutiveFailures >= DISCONNECT_THRESHOLD) {
        this.connected = false;
        this.emit("disconnected");
      }
    } finally {
      this.polling = false;
    }
  }

  private async tryHttpDiscovery(): Promise<CdpDetection | null> {
    try {
      const response = await fetch(`http://127.0.0.1:${this.cdpPort}/json/version`);
      if (!response.ok) return null;
      const data = (await response.json()) as {
        Browser?: string;
        "Protocol-Version"?: string;
        webSocketDebuggerUrl?: string;
      };

      if (!data.webSocketDebuggerUrl) return null;
      return {
        mode: "http",
        browserInfo: {
          browser: data.Browser ?? "Unknown browser",
          version: data["Protocol-Version"] ?? "Unknown protocol",
        },
        wsUrl: data.webSocketDebuggerUrl,
      };
    } catch {
      return null;
    }
  }

  private async tryWebSocketProbe(): Promise<CdpDetection | null> {
    const wsUrl = `ws://127.0.0.1:${this.cdpPort}/devtools/browser`;
    const probeTimeoutMs = 5 * 60_000;

    return new Promise((resolve) => {
      let settled = false;
      const ws = new WebSocket(wsUrl);
      const timer = setTimeout(() => done(null, "timeout"), probeTimeoutMs);

      const done = (result: CdpDetection | null, reason?: string) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (reason) {
          console.log(
            `[CdpPoller] WS probe ${result ? "succeeded" : "failed"}: ${reason}`,
          );
        }
        try {
          ws.close();
        } catch {
          // ignore close errors
        }
        resolve(result);
      };

      ws.on("open", () => {
        console.log(
          "[CdpPoller] WS probe connected; waiting for browser debugging consent",
        );
        ws.send(JSON.stringify({ id: 1, method: "Browser.getVersion" }));
      });
      ws.on("message", (data) => {
        try {
          const msg = JSON.parse(typeof data === "string" ? data : data.toString());
          if (msg.id === 1 && msg.result) {
            done({
              mode: "websocket-direct",
              browserInfo: {
                browser: msg.result.product ?? "Unknown browser",
                version: msg.result.protocolVersion ?? "Unknown protocol",
              },
              wsUrl,
            }, `got version: ${msg.result.product ?? "browser"}`);
          }
        } catch {
          done(null, "parse error");
        }
      });
      ws.on("error", (error) => done(null, `error: ${error.message}`));
    });
  }
}
