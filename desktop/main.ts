import { spawn, spawnSync } from "node:child_process";
import { app, BrowserWindow, shell } from "electron";
import { CdpClient } from "./cdp-client";
import { CdpCommands } from "./cdp-commands";
import { CdpPoller, type BrowserInfo, type CdpDetection } from "./cdp-poller";
import { LocalRelayServer } from "./local-relay-client";

type CdpMode = CdpDetection["mode"];
type FlagBrowser = "chrome" | "edge";

let windowRef: BrowserWindow | null = null;
let cdpClient: CdpClient | null = null;
let cdpCommands: CdpCommands | null = null;
let browserInfo: BrowserInfo | undefined;
let cdpMode: CdpMode | undefined;
let connected = false;

const poller = new CdpPoller();
const relay = new LocalRelayServer(
  () => cdpCommands,
  () => ({
    enabled: poller.isPolling(),
    connected,
    browserInfo,
  }),
);

function createWindow() {
  windowRef = new BrowserWindow({
    width: 520,
    height: 500,
    minWidth: 420,
    minHeight: 450,
    title: "Open GTM Browser Companion",
    frame: false,
    titleBarStyle: "hiddenInset",
    autoHideMenuBar: true,
    backgroundColor: "#f8f7f3",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  void windowRef.loadURL(
    `data:text/html;charset=utf-8,${encodeURIComponent(renderStatusHtml())}`,
  );

  windowRef.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith("open-gtm://")) return;
    event.preventDefault();
    void handleCompanionAction(url);
  });

  windowRef.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("open-gtm://")) {
      void handleCompanionAction(url);
      return { action: "deny" };
    }
    void shell.openExternal(url);
    return { action: "deny" };
  });
}

function refreshWindow() {
  if (!windowRef || windowRef.isDestroyed()) return;
  void windowRef.loadURL(
    `data:text/html;charset=utf-8,${encodeURIComponent(renderStatusHtml())}`,
  );
}

function getDefaultBrowserCommand() {
  if (process.platform === "darwin") {
    return "/Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=9222";
  }

  if (process.platform === "win32") {
    return '"%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe" --remote-debugging-port=9222';
  }

  return "chromium --remote-debugging-port=9222";
}

async function handleCompanionAction(url: string) {
  const parsed = new URL(url);
  if (parsed.hostname !== "flags") return;

  const browser = parsed.pathname.replace("/", "") as FlagBrowser;
  if (browser !== "chrome" && browser !== "edge") return;

  await openFlagPage(browser);
}

async function openFlagPage(browser: FlagBrowser) {
  const url =
    browser === "chrome"
      ? "chrome://flags/#remote-debugging"
      : "edge://flags/#edge-devtools-wdp-remote-debugging";

  if (openWithNativeBrowser(browser, url)) return;
  await shell.openExternal(url);
}

function openWithNativeBrowser(browser: FlagBrowser, url: string) {
  if (process.platform === "darwin") {
    return spawnDetached("open", [
      "-a",
      browser === "chrome" ? "Google Chrome" : "Microsoft Edge",
      url,
    ]);
  }

  if (process.platform === "win32") {
    return spawnDetached("cmd", [
      "/c",
      "start",
      "",
      browser === "chrome" ? "chrome" : "msedge",
      url,
    ]);
  }

  const candidates =
    browser === "chrome"
      ? ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser"]
      : ["microsoft-edge", "microsoft-edge-stable", "msedge"];

  const command = candidates.find((candidate) => commandExists(candidate));
  return command ? spawnDetached(command, [url]) : false;
}

function commandExists(command: string) {
  const result = spawnSync("sh", ["-lc", `command -v ${command}`], {
    stdio: "ignore",
  });
  return result.status === 0;
}

function spawnDetached(command: string, args: string[]) {
  try {
    const child = spawn(command, args, {
      detached: true,
      stdio: "ignore",
    });
    child.unref();
    return true;
  } catch {
    return false;
  }
}

function renderStatusHtml() {
  const status = connected
    ? `${browserInfo?.browser ?? "Browser"} attached`
    : "Waiting for native Chrome or Edge";
  const tone = connected
    ? cdpMode === "websocket-direct"
      ? "Permission granted"
      : "Remote debugging detected"
    : "Open your browser and click Allow if prompted";
  const command = getDefaultBrowserCommand();
  const relayPort = process.env.BROWSER_RELAY_PORT || "4123";

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      :root { color-scheme: light; --ink: #111816; --muted: #64706b; --line: #e0e5e1; --panel: #ffffff; --surface: #f4f5f1; --ready: #168255; --wait: #b35c17; }
      * { box-sizing: border-box; }
      html, body { height: 100%; }
      body { margin: 0; background: var(--surface); color: var(--ink); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; -webkit-app-region: drag; }
      button, code, details, a { -webkit-app-region: no-drag; }
      main { min-height: 100%; padding: 20px; }
      .shell { min-height: calc(100vh - 40px); display: flex; flex-direction: column; gap: 16px; }
      .top { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
      .eyebrow { color: #717b76; font-size: 11px; font-weight: 800; letter-spacing: 0; text-transform: uppercase; }
      h1 { margin: 5px 0 0; font-size: 25px; line-height: 1.1; letter-spacing: 0; }
      .close { width: 30px; height: 30px; border: 1px solid transparent; border-radius: 6px; background: transparent; color: #75807b; cursor: default; font-size: 19px; line-height: 1; }
      .close:hover { background: #e7eae6; color: var(--ink); }
      .status { display: grid; gap: 14px; padding: 18px; border: 1px solid var(--line); border-radius: 8px; background: var(--panel); box-shadow: 0 18px 50px rgba(30, 37, 34, 0.09); }
      .status-row { display: flex; align-items: center; gap: 10px; font-size: 15px; font-weight: 750; }
      .dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: ${connected ? "var(--ready)" : "var(--wait)"};
        box-shadow: 0 0 0 4px ${connected ? "rgba(22, 121, 79, 0.14)" : "rgba(154, 91, 19, 0.15)"};
      }
      .tone { display: inline-flex; width: fit-content; padding: 6px 9px; border-radius: 999px; background: ${connected ? "#e3f5ec" : "#f8eadc"}; color: ${connected ? "var(--ready)" : "var(--wait)"}; font-size: 12px; font-weight: 750; }
      p { margin: 0; color: var(--muted); line-height: 1.5; font-size: 14px; }
      .hint { max-width: 440px; }
      .steps { display: grid; gap: 9px; margin: 0; padding: 0; list-style: none; }
      .steps li { display: grid; grid-template-columns: 22px 1fr; align-items: start; gap: 8px; color: #34413b; font-size: 13px; line-height: 1.4; }
      .num { display: inline-grid; place-items: center; width: 22px; height: 22px; border: 1px solid #dce3dd; border-radius: 999px; background: #fff; color: #5f6c66; font-size: 11px; font-weight: 800; }
      .flags { display: grid; gap: 11px; padding: 14px; border: 1px solid var(--line); border-radius: 8px; background: #fff; }
      .flags-title { color: #111816; font-size: 13px; font-weight: 800; }
      .flag-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; }
      .flag {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 38px;
        border: 1px solid #d8dfd9;
        border-radius: 7px;
        background: #f9faf7;
        color: #18211d;
        font-size: 13px;
        font-weight: 750;
        text-decoration: none;
      }
      .flag:hover { border-color: #bfc9c2; background: #f1f4f0; }
      details { border-top: 1px solid var(--line); padding-top: 12px; }
      summary { color: #5f6a65; cursor: default; font-size: 13px; font-weight: 750; list-style-position: inside; }
      code { margin-top: 10px; display: block; white-space: pre-wrap; overflow-wrap: anywhere; padding: 12px; border-radius: 8px; background: #111816; color: #f4f1e9; font-size: 11px; line-height: 1.45; }
      .relay { margin-top: auto; padding-top: 2px; color: #7b8681; font-size: 12px; }
    </style>
  </head>
  <body>
    <main>
      <section class="shell">
        <div class="top">
          <div>
            <div class="eyebrow">Local browser relay</div>
            <h1>Open GTM Companion</h1>
          </div>
          <button class="close" type="button" aria-label="Close" onclick="window.close()">×</button>
        </div>
        <div class="status">
          <div class="status-row"><span class="dot"></span>${status}</div>
          <div class="tone">${tone}</div>
          <ul class="steps">
            <li><span class="num">1</span><span>Keep your normal Chrome or Edge window open.</span></li>
            <li><span class="num">2</span><span>Approve the browser debugging prompt when it appears.</span></li>
            <li><span class="num">3</span><span>Use Post now on the Reddit test card.</span></li>
          </ul>
        </div>
        <div class="flags">
          <div class="flags-title">Debugging flag setup</div>
          <div class="flag-actions">
            <a class="flag" href="open-gtm://flags/chrome">Open Chrome flags</a>
            <a class="flag" href="open-gtm://flags/edge">Open Edge flags</a>
          </div>
        </div>
        <p class="hint">This app does not launch a separate browser. It only attaches to the native browser session exposed on local CDP port 9222.</p>
        <details>
          <summary>Fallback launch command</summary>
          <code>${command}</code>
        </details>
        <div class="relay">Local relay: http://127.0.0.1:${relayPort}</div>
      </section>
    </main>
  </body>
</html>`;
}

async function connectToCdp(detection: CdpDetection) {
  connected = true;
  browserInfo = detection.browserInfo;
  cdpMode = detection.mode;
  refreshWindow();

  try {
    cdpClient = new CdpClient();
    await cdpClient.connect(detection.wsUrl);
    cdpCommands = new CdpCommands(cdpClient);
    cdpClient.onClose(() => {
      connected = false;
      browserInfo = undefined;
      cdpMode = undefined;
      cdpCommands = null;
      cdpClient = null;
      poller.reset();
      refreshWindow();
    });
    console.log("[BrowserCompanion] Connected to CDP", detection.browserInfo);
  } catch (error) {
    console.error("[BrowserCompanion] CDP connection failed", error);
    connected = false;
    browserInfo = undefined;
    cdpMode = undefined;
    cdpCommands = null;
    cdpClient = null;
    poller.reset();
    refreshWindow();
  }
}

poller.on("connected", (detection: CdpDetection) => {
  void connectToCdp(detection);
});
poller.on("disconnected", () => {
  connected = false;
  browserInfo = undefined;
  cdpMode = undefined;
  cdpCommands = null;
  void cdpClient?.close();
  cdpClient = null;
  refreshWindow();
});

app.whenReady().then(() => {
  createWindow();
  relay.start();
  poller.start();
});

app.on("window-all-closed", () => {
  relay.stop();
  poller.stop();
  void cdpCommands?.cleanup();
  void cdpClient?.close();
  app.quit();
});
