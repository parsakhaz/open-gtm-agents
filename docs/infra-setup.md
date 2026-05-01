# Infrastructure Setup

## Vercel

The local repo is linked to the Vercel project `parsas/open-gtm-agents`.

Project metadata lives in `.vercel/project.json`, which is ignored by git.
The project is connected to the GitHub repository `parsakhaz/open-gtm-agents`.

Useful commands:

```bash
vercel project ls
vercel git connect https://github.com/parsakhaz/open-gtm-agents.git
vercel env ls
vercel deploy
```

Configured environment variables:

```bash
OPENAI_API_KEY
OPENAI_MODEL
OPENAI_HIGH_QUALITY_MODEL
OPENAI_FAST_MODEL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
BROWSER_RELAY_URL
BROWSER_RELAY_PORT
```

Optional environment variables:

```bash
EXA_API_KEY
OPENAI_RESEARCH_MODEL
OPENAI_RESEARCH_REASONING_EFFORT
RESEARCH_LIVE_QUERY_COUNT
RESEARCH_LIVE_SEARCH_RESULTS
RESEARCH_LIVE_FETCH_RESULTS
```

Defaults: `RESEARCH_LIVE_QUERY_COUNT=3`,
`RESEARCH_LIVE_SEARCH_RESULTS=8`, and `RESEARCH_LIVE_FETCH_RESULTS=6`.

Dry Run intentionally falls back to seeded demo output when provider keys are
missing. Real Mode requires provider credentials and surfaces provider failures
after up to three immediate retries. OpenAI and Supabase runtime variables are
configured in Vercel for production and development. The fast foreground Real
Mode path uses `OPENAI_RESEARCH_MODEL` when present, then `OPENAI_MODEL`,
then `OPENAI_FAST_MODEL`, with high reasoning effort by default. The OpenAI-backed web
researcher path has been smoke-tested successfully with a cited web research artifact at
[`docs/research/2026-04-30-web-nextjs-turbopack.md`](research/2026-04-30-web-nextjs-turbopack.md).

Real Mode validation:

```bash
npm run test:exa
npm run test:web-researcher
```

## Browser Companion

Local browser use depends on the Electron companion and the user's existing Chrome or Edge CDP session.

Use:

```bash
npm run dev:local
```

The runner pulls `.env.local` from Vercel when missing, loads `.env` and `.env.local`, stops stale Next dev processes for the worktree, picks available ports, starts Next.js, and starts the browser relay.

The generic mission runner is:

```bash
npm run browser:mission -- --mission "do something harmless and fun in the browser" --start-url "https://neal.fun/" --max-turns 35
```

Browser use logs should be checked in `tmp/dev-local.out.log`, `tmp/dev-local.err.log`, `tmp/browser-mission-test.log`, and `.next/dev/logs/next-development.log`.

## Supabase

Local Supabase CLI config is initialized in `supabase/config.toml`.

Schema files:

```bash
supabase/schema.sql
supabase/migrations/20260430183000_initial_research_schema.sql
```

The intended cloud project is `hejmyjuwpaencxyjnzrb`, exposed at
`https://hejmyjuwpaencxyjnzrb.supabase.co`.

The local Supabase CLI is linked to `hejmyjuwpaencxyjnzrb`.

The remote database has the initial research schema applied:

```bash
tmp/bin/supabase migration list
```

Current migration state:

```text
Local          | Remote
20260430183000 | 20260430183000
```

To push future migrations:

```bash
tmp/bin/supabase db push
```

For local development with Docker available:

```bash
tmp/bin/supabase start
tmp/bin/supabase db reset
```
