import type {
  BrowserCommand,
  BrowserConnectionStatus,
  CommandResult,
} from "@/lib/browser-relay/types";
import { debugLog, durationMs, previewForLog } from "@/lib/debug-log";

export type BrowserRelayTransport = {
  getStatus(): Promise<BrowserConnectionStatus>;
  execute(command: BrowserCommand): Promise<CommandResult>;
};

const DEFAULT_RELAY_URL = "http://127.0.0.1:4123";

export class LocalBrowserRelayTransport implements BrowserRelayTransport {
  constructor(
    private relayUrl = process.env.BROWSER_RELAY_URL || DEFAULT_RELAY_URL,
  ) {}

  async getStatus(): Promise<BrowserConnectionStatus> {
    const startedAt = Date.now();
    debugLog("browser-relay-client", "status request", { relayUrl: this.relayUrl });
    const response = await fetch(`${this.relayUrl}/status`, {
      cache: "no-store",
    });

    if (!response.ok) {
      debugLog("browser-relay-client", "status unavailable", {
        status: response.status,
        durationMs: durationMs(startedAt),
      }, "warn");
      return {
        enabled: false,
        connected: false,
      };
    }

    const status = (await response.json()) as BrowserConnectionStatus;
    debugLog("browser-relay-client", "status response", {
      ...status,
      durationMs: durationMs(startedAt),
    });
    return status;
  }

  async execute(command: BrowserCommand): Promise<CommandResult> {
    const startedAt = Date.now();
    debugLog("browser-relay-client", "execute command", {
      name: command.name,
      command: previewForLog(command),
    });
    const response = await fetch(`${this.relayUrl}/command`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ command }),
      cache: "no-store",
    });

    if (!response.ok) {
      debugLog("browser-relay-client", "execute transport error", {
        name: command.name,
        status: response.status,
        durationMs: durationMs(startedAt),
      }, "warn");
      return {
        ok: false,
        error: `Browser relay returned ${response.status}. Is the Electron companion running?`,
      };
    }

    const result = (await response.json()) as CommandResult;
    debugLog("browser-relay-client", "execute result", {
      name: command.name,
      ok: result.ok,
      durationMs: durationMs(startedAt),
      result: previewForLog(result.result ?? result.error),
    }, result.ok ? "info" : "warn");
    return result;
  }
}

export const localBrowserRelay = new LocalBrowserRelayTransport();
