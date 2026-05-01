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
- Local browser-assisted execution for approved user actions
- A polished dry-run mode for the hackathon demo

## Stack

The current stack direction is:

- Vercel Pro for hosting, serverless functions, cron, and deployment
- Next.js for the web application
- Vercel AI SDK for model calls, structured outputs, tool use, and streaming
- OpenAI as the model provider
- Exa for website ingestion, web search, and source retrieval
- Supabase for Postgres, auth, run state, and later pgvector
- Resend for email notifications
- Internal OpenAI-backed web researcher service for broad web and social research, implemented and smoke-tested
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

The foreground Real Mode path uses two layers:

1. Provider execution emits NDJSON events from `/api/research/run`.
2. The client presentation layer receives those events continuously, buffers them when the user is at a review gate, and reveals them through a dry-run-like cadence.

This distinction matters because the GTM profile and opportunity extraction calls currently return structured JSON batches, not token-level per-card output. Real Mode should still feel alive during those waits by showing the live preview, pending stepper motion, granular provider statuses, and clear debug logs, while keeping final profile/source/opportunity content tied to actual provider output.

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
- Internal OpenAI-backed web researcher service for broad social search and web research. Implemented and validated with a manual cited web research call.
- Apify or RapidAPI only as fallback providers where useful

Official posting APIs are not required for the first version. The product should draft comments and posts for manual user approval.

## Browser Companion

Approved browser actions use a local companion rather than platform posting APIs.

The current flow is:

1. The dry-run UI sends an approved action to `/api/browser/post-comment`.
2. `BrowserOrchestratorService` turns that request into a constrained browser mission.
3. `BrowserAgentService.runMission` executes the mission with OpenAI Responses API function calls.
4. Next.js sends CDP commands to the local Electron relay.
5. The relay controls the user's existing Chrome or Edge CDP session.
6. The API streams status, tool, retry, handoff, and final result events back to the UI.

The browser executor uses `gpt-5.4-mini` with high reasoning effort and a 35-turn mission budget. The orchestrator layer uses `OPENAI_HIGH_QUALITY_MODEL` or `gpt-5.5` as the high-quality planning model.

The design deliberately keeps state-changing actions constrained. Browser missions must stop for login, captcha, missing permissions, credentials, ambiguous destructive confirmations, or unsafe actions. Generic browser missions are available through `npm run browser:mission`, but the default constraints prohibit posting, messaging, following, buying, downloading, signing in, or changing settings.

See [browser-use.md](browser-use.md) for local run commands, logs, and test notes.

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
- `BrowserOrchestratorService`
- `BrowserAgentService`

The internal web researcher sits behind a stable interface. It can have a dynamic internal schema, but the product should receive normalized findings, sources, and streamed events.

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

1. Dry-run live run screen with polished streaming visuals. Done.
2. Landing page input and demo profile generation. Done with seeded dry-run data.
3. Real Salon Agent iframe preview with desktop scaling and page-down style navigation. Done with fallback simulation.
4. Opportunity and post suggestion cards. Done.
5. Seeded and live-capable research event API. Done at `/api/research/run`.
6. Supabase schema for runs, profile fields, source results, opportunities, drafts, and feedback. Done and pushed to the linked remote project.
7. OpenAI-backed web researcher with structured Responses API output. Done and smoke-tested with a cited web research call.
8. Exa website ingestion. Done for Real Mode when `EXA_API_KEY` is configured.
9. GTM profile inference with live model calls. Done for the foreground Real Mode demo path.
10. Hacker News and GitHub source adapters. Remaining.
11. Resend approval email flow. Remaining.
12. Vercel Cron hourly run. Remaining.

## Current Hackathon State

The project now has a working Next.js dry-run frontend.

Implemented:

- Tailwind v4 theme with Supabase-inspired tokens.
- shadcn-style local UI primitives.
- Framer Motion transitions.
- Simple Icons for platform logos.
- lucide-react for interface actions.
- Dry-run event state machine.
- Live onboarding view with real Salon Agent iframe, desktop viewport scaling, and page-down style motion.
- Streaming GTM schema panel.
- Discovery review deck with opportunity queue and focused selected-item review.
- Seeded rewrite variants and approval/copy actions.
- Seeded and OpenAI-backed research service with NDJSON API route.
- Homepage Dry Run / Real Mode toggle.
- Real Mode uses Exa contents/search plus structured OpenAI calls to stream live profile fields, source results, search angles, and opportunity cards.
- Real Mode reuses the Dry Run visual shell but parameterizes the preview by submitted URL/site name and shows neutral placeholders until live profile fields arrive.
- The live profile event mapper paces field reveals through the Dry Run website-section sequence so the iframe scroll and stepper advance progressively.
- Real Mode accepts a scan window from the start form, defaults it to 14 days, and sends it to Exa search as `startPublishedDate`. The planner creates 10-15 platform-aware research missions; each mission is executed as an independent Exa search, then results are deduped, scored, and ranked best-to-worst. Platform-specific research missions first use matching domain filters, then fall back to a broader same-recency pass when too few quality candidates are found.
- The live research client keeps reading streamed events while profile/research gates are held, then reveals buffered events progressively after the user proceeds. Development logs use the `real-research-ui` prefix for event queued/revealed and gate timing.
- Provider and agent calls retry up to three immediate attempts and log redacted provider timing/details.
- OpenAI-backed web researcher smoke test saved at [research/2026-04-30-web-nextjs-turbopack.md](research/2026-04-30-web-nextjs-turbopack.md).
- Local browser companion relay, generic browser mission service, and dry-run Post now integration.
- Supabase SQL schema applied to the linked remote project.

Verified:

- `npm run lint`
- `npm run build`
- `npm run test:exa`
- `npm run test:web-researcher`
- `npm run dev:local`
- `npm run browser:mission -- --mission "do something fun on the browser for me surprise me" --start-url "https://neal.fun/" --max-turns 35`
- Manual web research call using official Next.js sources

The foreground Real Mode path is optimized for demo latency while preserving GTM quality. It uses `OPENAI_RESEARCH_MODEL` when present, then `OPENAI_MODEL`, then `OPENAI_FAST_MODEL`, and defaults reasoning effort from `OPENAI_RESEARCH_REASONING_EFFORT` to high. The nano/low profile remains useful for speed benchmarking, but the default live demo path favors mini/high so external research missions are less brittle.
