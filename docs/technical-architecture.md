# Technical Architecture

## Goal

Open GTM Agents should be fast to build, visually compelling, and credible as an agent-native GTM product.

The first architecture should avoid unnecessary infrastructure while still supporting:

- Landing page ingestion
- GTM profile inference
- Live streamed research progress
- Comment and post opportunity discovery
- Hourly recurring research
- Resend email notifications
- Human-reviewed draft responses
- A polished dry-run mode for the hackathon demo

## Stack

The current stack direction is:

- Vercel Pro for hosting, serverless functions, cron, and deployment
- Next.js for the web application
- Vercel AI SDK for model calls, structured outputs, tool use, and streaming
- OpenRouter as the model provider
- Exa for website ingestion, web search, and source retrieval
- Supabase for Postgres, auth, run state, and later pgvector
- Resend for email notifications
- xAI or the provided web researcher agent for broad web and social research
- GitHub APIs for issue and repository search
- Hacker News public APIs for Hacker News search
- Apify or RapidAPI as fallback source providers if needed

The first version should not depend on Trigger.dev, Inngest, or a separate job system. Vercel Cron plus Supabase run tables are enough until the workload forces a dedicated queue.

The hackathon version is single-user by default. Supabase Auth can be used because it is fast and fits the chosen database, but auth should not slow down the dry-run demo.

## Core Product Flow

1. User enters a landing page.
2. The app creates a research run in Supabase.
3. A Vercel function starts the onboarding research.
4. The UI streams agent status updates and opportunity cards.
5. The system saves the inferred GTM profile, source references, and opportunities.
6. The user edits profile sections and accepts suggested additions.
7. Hourly cron runs continue searching for new opportunities.
8. Resend emails the user when meaningful new opportunities appear.

The first implementation should support a dry-run mode that follows the same UI and event contract with seeded or generated demo data. This lets the front end, visual design, and streaming experience be completed before all external source integrations are stable.

See [dry-run-demo.md](dry-run-demo.md) for the planned user journeys, two-minute judge flow, and frontend component priorities.

## Live Run UX

The hackathon experience should make the agent's work visible.

The live run screen should show stages such as:

- Reading website
- Inferring GTM profile
- Mapping competitors and alternatives
- Generating search angles
- Searching sources
- Evaluating fit and risk
- Drafting comments
- Suggesting original posts
- Saving opportunities
- Sending alerts

Opportunity cards should appear as soon as they are ready. The user should not have to wait for the full research run to finish.

Each opportunity card should include:

- Source badge
- Title or thread summary
- URL
- Why it matters
- Suggested action
- Draft comment or post
- Fit score
- Risk score
- Copy action
- Feedback actions

Post suggestion cards can use the same stream and card pattern, but should be visually distinct from comment opportunities.

## Streaming Pattern

The main run should be treated as an application event stream, not only an LLM token stream.

Event types can include:

```ts
type RunEvent =
  | {
      type: "status";
      runId: string;
      message: string;
      stage: string;
    }
  | {
      type: "opportunity";
      runId: string;
      opportunity: OpportunityCard;
    }
  | {
      type: "profile_update";
      runId: string;
      field: string;
      value: unknown;
    }
  | {
      type: "done";
      runId: string;
    }
  | {
      type: "error";
      runId: string;
      message: string;
    };
```

For the first version, this can be a streaming response from a single API route. If needed, it can later move to a `run_id` plus Server-Sent Events or polling model.

## Vercel Function Duration

Research may take up to five minutes.

Vercel Pro with Fluid Compute gives enough headroom for this first version. Research routes should explicitly set a suitable max duration.

```ts
export const maxDuration = 300;
```

If runs become longer or more numerous, the system can split work into smaller run steps and process them across cron invocations.

## Hourly Research

Vercel Cron should run the recurring discovery workflow every hour.

The cron route should:

1. Find active product profiles due for research.
2. Create a `research_runs` record.
3. Generate or refresh search angles.
4. Query configured source adapters.
5. Normalize raw source results.
6. Rank and dedupe opportunities.
7. Save new opportunities.
8. Create notifications for meaningful new results.
9. Send email through Resend.

For the first version, the cron function can process a bounded number of profiles per invocation.

Notifications do not need a complex notification product in the first version. Resend should send an email whenever a new opportunity or post suggestion needs user approval.

## Source Adapters

Each source should sit behind a common adapter interface.

```ts
type SourceAdapter = {
  id: "web" | "reddit" | "x" | "hacker_news" | "github";
  search(input: SourceSearchInput): Promise<RawMention[]>;
};
```

Likely source implementations:

- Exa for web search and website content
- Hacker News Algolia API for Hacker News
- GitHub Search API for GitHub issues, discussions, and repositories
- xAI or the provided web researcher agent for Reddit, X, broad social search, and web search
- Apify or RapidAPI only as fallback providers where useful

Official posting APIs are not required for the first version. The product should draft comments and posts for manual user approval.

## Agent Services

The system can be organized as small services rather than a heavy multi-agent framework.

Suggested services:

- `WebsiteIngestionService`
- `GTMProfileBuilder`
- `DynamicQuestionGenerator`
- `SearchAnglePlanner`
- `SourceResearchService`
- `OpportunityRanker`
- `DraftGenerator`
- `NotificationService`
- `DryRunService`

The existing web researcher agent should be ported behind a stable interface. It can have a dynamic internal schema, but the product should receive normalized findings, sources, and streamed events.

```ts
type ResearchRequest = {
  productProfileId: string;
  objective: "onboarding" | "opportunity_discovery" | "competitive_intel";
  queries?: string[];
  sources?: string[];
  constraints?: string[];
};

type ResearchResult = {
  findings: Finding[];
  sources: SourceReference[];
  confidence: number;
  suggestedFollowups: string[];
};
```

The agent should be stateful at the product level. It should be able to write profile fields, run events, source results, opportunities, drafts, and notifications directly to Supabase through controlled tool calls or service functions.

## Data Model

Initial tables:

- `users`
- `workspaces`
- `product_profiles`
- `gtm_profile_fields`
- `research_runs`
- `run_events`
- `sources`
- `source_results`
- `opportunities`
- `opportunity_drafts`
- `notifications`
- `user_feedback`

Important behavior:

- Store source URLs and evidence for every opportunity.
- Store model, prompt version, and run metadata for debugging.
- Dedupe intelligently using source IDs, canonical URLs, prior feed context, and model judgment.
- Track accepted, edited, dismissed, and copied opportunities.

## Email Notifications

Resend should send emails when new high-quality opportunities or post suggestions need user approval.

Email criteria should include:

- New or not previously notified
- Relevant above threshold
- Fresh enough to act on
- Low enough risk
- Not muted by user settings
- Not a duplicate of a prior opportunity

Emails should link back to the opportunity inbox. The app remains the primary review surface.

## Human Review

The system should not silently post to public platforms.

The first product should:

- Draft suggested comments and posts
- Encourage transparent affiliation
- Let users copy, edit, dismiss, and give feedback
- Track what worked over time

This protects users from platform bans and keeps the product aligned with useful participation instead of automation spam.

## Near-Term Build Order

1. Dry-run live run screen with polished streaming visuals
2. Landing page input and demo profile generation
3. Opportunity and post suggestion cards
4. Supabase persistence for runs, events, profile fields, and opportunities
5. Exa website ingestion
6. GTM profile inference with editable fields
7. Search angle generation
8. Web researcher or xAI source integration
9. Hacker News and GitHub source adapters
10. Opportunity ranking and draft generation
11. Resend approval email flow
12. Vercel Cron hourly run
