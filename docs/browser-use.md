# Browser Use

## Current State

The dry-run UI now has a local browser companion path for approved browser actions.

The implementation uses:

- Next.js API route `/api/browser/post-comment` for the dry-run Post now action
- `BrowserOrchestratorService` to turn the UI request into a browser mission
- `BrowserAgentService.runMission` to execute the mission with CDP tools
- Electron desktop companion relay on `http://127.0.0.1:4123`
- the user's existing Chrome or Edge CDP session, not a separate automation-only browser
- `gpt-5.4-mini` with high reasoning effort for browser execution
- `OPENAI_HIGH_QUALITY_MODEL` or `gpt-5.5` for the orchestrator label/decision layer

Browser missions default to 35 turns. Shorter runs were not enough for real pages with navigation, rate limits, dynamic UI, or slow snapshots.

## Local Run

Use the universal runner:

```bash
npm run dev:local
```

It:

- pulls `.env.local` from Vercel when missing, or when run with `--env pull`
- loads `.env` and `.env.local` into the parent process
- stops stale Next dev processes for this worktree by default
- finds open ports when `3000` or `4123` are busy
- starts Next.js and the Electron browser companion together
- passes `BROWSER_RELAY_URL` into Next so the API talks to the relay that actually started

Useful options:

```bash
npm run dev:local -- --port 3003
npm run dev:local -- --relay-port 4125
npm run dev:local -- --env pull
npm run dev:local -- --desktop false
npm run dev:local -- --kill-existing false
```

## Mission CLI

Generic browser missions can be run without the dry-run UI:

```bash
npm run browser:mission -- --mission "do something harmless and fun in the browser" --start-url "https://neal.fun/" --max-turns 35
```

The CLI loads `.env` and `.env.local`, uses the local relay, streams JSON events to stdout, and emits a clean `browser_error` event on provider failures.

The mission CLI is intentionally constrained for safety. It should not post, comment, message, like, follow, subscribe, buy, download, upload, sign in, or change settings.

## Logging

Browser runs log at each boundary:

- `browser-api`: request validation and stream lifecycle
- `browser-orchestrator`: mission creation
- `browser-agent`: mission start, model turns, tool calls, retry decisions, handoffs, final result
- `browser-relay-client`: relay status and command transport
- `desktop-relay`: local relay requests and command completion
- `cdp`: CDP command execution and result previews

Logs redact common secret fields and truncate large payloads. Screenshot bytes are stripped before being returned to the model.

During tests, always inspect:

```bash
tmp/dev-local.out.log
tmp/dev-local.err.log
tmp/browser-mission-test.log
```

Next dev logs are also available at:

```bash
.next/dev/logs/next-development.log
```

## Test Results

Verified:

- `npm run lint`
- `npm run build`
- `npm run dev:local`
- `npm run browser:mission -- --mission "do something fun on the browser for me surprise me" --start-url "https://neal.fun/" --max-turns 35`

The browser mission path successfully connected to the local Edge CDP relay and opened `https://neal.fun/deep-sea/` through direct relay commands during testing.

The full model-driven mission test reached OpenAI but stopped before the first tool call because `gpt-5.4-mini` hit the account daily request limit. The agent now fails fast on hard daily rate limits and emits a clean `browser_error` instead of a stack trace.
