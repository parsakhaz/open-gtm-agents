# Browser Agent Local Demo

This demo controls your real Chrome or Edge profile through Chrome DevTools Protocol (CDP). It is intentionally local-first.

## Run It

For the native-browser demo, run this repo from the same OS that owns Chrome or Edge. If the browser is Windows Edge/Chrome, run the project from Windows rather than WSL so Electron and the browser share the same `127.0.0.1:9222`.

Start your default browser profile with remote debugging enabled. If Chrome or Chromium is already running, quit it first so the new process owns the debugging port.

```bash
# macOS
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222

# Linux
chromium --remote-debugging-port=9222

# Windows PowerShell
& "$env:ProgramFiles\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222
```

Then start the browser companion:

```bash
npm run desktop:dev
```

Start the Next app:

```bash
npm run dev
```

Open the app, run the GTM demo, expand an opportunity card, and use:

- `Open` to inspect the source URL yourself.
- `Post now` to let the browser agent open the URL, insert the prepared draft, and submit it.

## Debug CDP

Before testing `Post now`, verify the browser exposes CDP:

```bash
npm run debug:cdp
```

The probe checks raw TCP, `/json/version`, `/json/list`, and the direct WebSocket path that can trigger the native browser Allow debugging prompt. If every host returns `ECONNREFUSED`, the browser is not listening on CDP yet or the app is running from a different OS/network namespace than the browser.

The Electron companion also includes one-click flag links:

- Chrome: `chrome://flags/#remote-debugging`
- Edge: `edge://flags/#edge-devtools-wdp-remote-debugging`

## Safety Model

`Post now` is the approval gate. The browser agent receives only the target URL and the prepared comment text. It is instructed not to change account settings, purchase, delete, follow, subscribe, send DMs, or navigate unrelated sites.

If the page needs login, captcha, credentials, or clarification, the agent should stop and report that instead of continuing.

## Local Relay

The Electron companion exposes a local HTTP relay on:

```text
http://127.0.0.1:4123
```

The Next server calls that relay while handling:

```text
POST /api/browser/post-comment
```

## Future Supabase Realtime Transport

For deployed use, replace the local HTTP relay with Supabase Realtime channels:

```text
browser:user:{userId}:commands
browser:user:{userId}:results
browser:user:{userId}:status
```

Use private channels and RLS policies on `realtime.messages`; do not use public Realtime channels for browser commands.
