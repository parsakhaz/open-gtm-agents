create extension if not exists pgcrypto;

create table if not exists product_profiles (
  id uuid primary key default gen_random_uuid(),
  website_url text not null,
  product_name text,
  summary text,
  status text not null default 'active',
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists gtm_profile_fields (
  id uuid primary key default gen_random_uuid(),
  product_profile_id uuid not null references product_profiles(id) on delete cascade,
  field_key text not null,
  label text not null,
  value text not null,
  confidence numeric not null check (confidence >= 0 and confidence <= 100),
  source text not null,
  suggestions jsonb not null default '[]'::jsonb,
  evidence jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(product_profile_id, field_key)
);

create table if not exists research_runs (
  id uuid primary key default gen_random_uuid(),
  product_profile_id uuid references product_profiles(id) on delete set null,
  website_url text not null,
  objective text not null check (
    objective in ('onboarding', 'opportunity_discovery', 'competitive_intel')
  ),
  mode text not null check (mode in ('demo', 'auto', 'live')),
  status text not null default 'queued' check (
    status in ('queued', 'running', 'completed', 'failed')
  ),
  prompt_version text not null,
  model text,
  metadata jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists run_events (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references research_runs(id) on delete cascade,
  type text not null,
  stage text,
  message text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists source_results (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references research_runs(id) on delete cascade,
  source_type text not null,
  source_url text not null,
  canonical_url text,
  title text,
  snippet text,
  fetched_content text,
  published_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists opportunities (
  id uuid primary key default gen_random_uuid(),
  product_profile_id uuid references product_profiles(id) on delete set null,
  run_id uuid references research_runs(id) on delete set null,
  source_result_id uuid references source_results(id) on delete set null,
  type text not null check (type in ('comment', 'post', 'competitive')),
  status text not null default 'needs_review',
  source_type text not null,
  source_url text not null,
  title text not null,
  location text,
  rationale text not null,
  suggested_action text not null,
  fit_score numeric not null check (fit_score >= 0 and fit_score <= 100),
  risk_score numeric not null check (risk_score >= 0 and risk_score <= 100),
  dedupe_key text,
  evidence jsonb not null default '[]'::jsonb,
  variants jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists opportunity_drafts (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references opportunities(id) on delete cascade,
  draft_type text not null check (
    draft_type in ('comment', 'post', 'competitive_note')
  ),
  content text not null,
  disclosure_note text,
  status text not null default 'draft',
  created_at timestamptz not null default now()
);

create table if not exists user_feedback (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid references opportunities(id) on delete cascade,
  action text not null,
  note text,
  edited_content text,
  created_at timestamptz not null default now()
);

create index if not exists research_runs_created_at_idx
  on research_runs(created_at desc);

create index if not exists run_events_run_id_created_at_idx
  on run_events(run_id, created_at);

create index if not exists source_results_run_id_idx
  on source_results(run_id);

create unique index if not exists opportunities_dedupe_key_idx
  on opportunities(dedupe_key)
  where dedupe_key is not null;

create index if not exists opportunities_run_id_created_at_idx
  on opportunities(run_id, created_at desc);
