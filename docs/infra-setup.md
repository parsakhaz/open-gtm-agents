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
```

Optional environment variables:

```bash
EXA_API_KEY
```

The research route intentionally falls back to seeded demo output when provider
keys are missing. OpenAI and Supabase runtime variables are configured in Vercel
for production and development.

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
