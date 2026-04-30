import type {
  BrowserCommand,
  BrowserConnectionStatus,
  CommandResult,
} from "@/lib/browser-relay/types";

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
    const response = await fetch(`${this.relayUrl}/status`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        enabled: false,
        connected: false,
      };
    }

    return (await response.json()) as BrowserConnectionStatus;
  }

  async execute(command: BrowserCommand): Promise<CommandResult> {
    const response = await fetch(`${this.relayUrl}/command`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ command }),
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        ok: false,
        error: `Browser relay returned ${response.status}. Is the Electron companion running?`,
      };
    }

    return (await response.json()) as CommandResult;
  }
}

export const localBrowserRelay = new LocalBrowserRelayTransport();
