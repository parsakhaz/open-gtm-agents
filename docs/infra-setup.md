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

Optional environment variables:

```bash
OPENAI_API_KEY
OPENAI_MODEL
OPENAI_HIGH_QUALITY_MODEL
OPENAI_FAST_MODEL
EXA_API_KEY
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
```

The research route intentionally falls back to seeded demo output when provider
keys are missing.

## Supabase

Local Supabase CLI config is initialized in `supabase/config.toml`.

Schema files:

```bash
supabase/schema.sql
supabase/migrations/20260430183000_initial_research_schema.sql
```

The intended cloud project is `hejmyjuwpaencxyjnzrb`, exposed at
`https://hejmyjuwpaencxyjnzrb.supabase.co`.

Vercel has `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` configured for production and
development.

The Supabase CLI still needs an access token before the local repo can link and
push migrations:

```bash
tmp/bin/supabase login --token <token>
tmp/bin/supabase link --project-ref hejmyjuwpaencxyjnzrb
tmp/bin/supabase db push
```

For local development with Docker available:

```bash
tmp/bin/supabase start
tmp/bin/supabase db reset
```
