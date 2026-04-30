# Dry Run Demo Plan

## Purpose

The dry run should make Open GTM Agents feel real before every external integration is wired.

The goal is to build the full user-facing experience first: polished UI, streamed agent progress, realistic data, opportunity cards, and approval flows. The backend can replace seeded/demo data with real Exa, the now smoke-tested web researcher, Supabase, and Resend calls without changing the core product experience.

See [dry-run-implementation-plan.md](dry-run-implementation-plan.md) for the concrete frontend build plan.

## Demo Thesis

The two-minute pitch should show that Open GTM Agents turns a landing page into actionable GTM work.

The audience should understand:

- The user gives one URL.
- The agent understands the product.
- The agent fills a GTM context schema.
- The agent finds comment opportunities and original post ideas.
- The user reviews and approves useful drafts.
- The system can keep running hourly and email the user when something needs approval.

## Ideal Two-Minute Judge Flow

### 0:00-0:15: Problem

Founders and small teams need distribution, but the right GTM moments are scattered across Reddit, Hacker News, GitHub, X, and the web.

Most social listening tools show dashboards. Open GTM Agents finds the moments where you should actually show up.

### 0:15-0:30: One-URL Onboarding

Show the landing page input.

The user enters a single URL for the demo product. For the first dry run, this URL can be hardcoded.

The interface immediately starts an agent run.

### 0:30-1:05: Live Website Understanding

Show the onboarding analysis screen.

Left side:

- The product website appears in an iframe-style preview.
- The preview slowly scrolls through the site.
- The agent appears to navigate sections or tabs such as home, pricing, docs, changelog, and GitHub if available.
- Visual highlights can indicate the agent is reading key sections.

Right side:

- GTM schema answers stream in as the agent infers them.
- Each answer should feel grounded in the visible website.
- Confidence indicators and source labels can appear as answers complete.
- Suggested additions appear as clickable chips.

This is the main visual moment. The judge should feel like the agent is actively reading and understanding the company.

### 1:05-1:30: Live Opportunity Discovery

Transition into the live run view.

Show agent stages:

- Generating search angles
- Searching Reddit
- Searching Hacker News
- Searching GitHub issues
- Searching X and the web
- Ranking opportunities
- Drafting comments and posts

Opportunity cards stream into the feed one by one.

Cards should include:

- Source badge
- Thread or issue title
- Why this matters
- Suggested action
- Draft comment or post
- Fit score
- Risk score
- Copy or approve action

### 1:30-1:50: Human Approval

Open one opportunity card.

Show:

- The original source context
- Why the opportunity is relevant
- A draft response
- Controls to make the draft shorter, softer, more technical, or more direct
- Approve/copy action

Make clear that the product helps users be useful, not spam platforms.

### 1:50-2:00: Recurring Agent

Show the hourly agent and email approval concept.

The closing line:

> Open GTM Agents keeps watching the market every hour and emails you only when there is something worth approving.

## Primary User Journeys

## Journey 1: First-Time Onboarding

1. User lands on Open GTM Agents.
2. User enters a product URL.
3. Agent starts a live analysis run.
4. Website preview appears and starts scrolling.
5. GTM schema answers stream in on the right.
6. User sees inferred answers, confidence, and source references.
7. User accepts suggested additions or edits fields.
8. Agent proceeds to opportunity discovery.

Dry run requirement:

- Use a hardcoded URL and seeded website sections.
- Simulate scrolling and navigation.
- Stream schema answers with realistic timing.
- Persist enough local state to make the run feel continuous.

## Journey 2: Opportunity Discovery

1. Agent generates search angles from the inferred GTM profile.
2. Agent searches configured sources.
3. Status updates stream into the UI.
4. Opportunity cards appear as soon as they are found.
5. User opens cards for more detail.
6. User copies, approves, dismisses, or asks the agent to rewrite.

Dry run requirement:

- Seed 6-10 opportunity cards.
- Include both comment opportunities and original post suggestions.
- Stagger cards over time.
- Make source activity visible.

## Journey 3: Approval And Rewrite

1. User opens a promising opportunity.
2. User reviews the source summary and relevance rationale.
3. User reads the generated draft.
4. User clicks a rewrite control.
5. The draft updates with a streamed rewrite effect.
6. User copies or approves the draft.

Dry run requirement:

- Rewrites can use deterministic seeded variants.
- The interaction should feel instant and polished.

## Journey 4: Hourly Agent And Email

1. Agent runs every hour after onboarding.
2. New relevant opportunities are saved.
3. Resend emails the user when approval is needed.
4. Email links back to the opportunity inbox.

Dry run requirement:

- Show this as a final state or timeline component.
- Actual Resend wiring can come after the visual demo.

## Onboarding Screen Design

The onboarding analysis screen should use a split layout.

Left panel: website preview.

- iframe-style browser frame
- URL bar with the submitted website
- page section navigation
- slow auto-scroll
- highlighted areas that imply the agent is reading
- optional tabs for homepage, docs, pricing, changelog, GitHub

Right panel: streaming GTM schema.

Schema sections:

- Product summary
- Target customer
- Pain points
- Competitors and alternatives
- Differentiators
- Search angles
- Communities and sources
- Engagement tone
- Things to avoid

Each section should support:

- loading state
- streamed answer
- confidence indicator
- source hint
- 2-3 suggested chips
- edit affordance

## Live Run Screen Design

The live run screen should make research feel active.

Suggested layout:

- Left rail: source/activity timeline
- Main area: streaming opportunity feed
- Right rail or drawer: selected opportunity details

Activity timeline examples:

- Reading website
- Building GTM profile
- Searching Reddit
- Searching Hacker News
- Searching GitHub issues
- Searching X/web
- Deduping against prior feed
- Drafting comments
- Drafting original post ideas

Card types:

- Comment opportunity
- Original post suggestion
- Competitive insight

## Dry Run Data

The first dry run should use a single hardcoded product URL chosen by the team.

Good candidates:

- BeamBell
- Salon Agent
- Another niche product with a clear audience and visible landing page

The dry run data should include:

- Website sections
- GTM schema answers
- Search angles
- Source activity events
- Comment opportunity cards
- Original post suggestion cards
- Competitive insights
- Draft variants

## Frontend Build Priorities

Start with the frontend and dry-run wiring.

Recommended first components:

- Landing page URL input
- Agent run shell
- Website preview frame
- Auto-scrolling website simulation
- Streaming schema panel
- Source activity timeline
- Opportunity card
- Opportunity detail drawer
- Draft rewrite controls
- Approval/copy actions
- Hourly agent/email summary state

Use shadcn/ui components where they help:

- cards
- tabs
- badges
- buttons
- drawers/sheets
- progress
- skeletons
- tooltips
- scroll areas

The design should feel like a serious GTM operations tool, not a generic AI chat app.

## Implementation Notes

The dry run should use the same event concepts as the real system.

Example event sequence:

```ts
type DryRunEvent =
  | { type: "status"; stage: string; message: string }
  | { type: "website_focus"; section: string; scrollTo: number }
  | { type: "schema_answer"; section: string; value: string; confidence: number }
  | { type: "suggestions"; section: string; suggestions: string[] }
  | { type: "source_search"; source: string; query: string }
  | { type: "opportunity"; card: OpportunityCard }
  | { type: "done" };
```

The dry run can be implemented with timers and local seeded data first. Later, real agent events should conform to the same stream shape.

## Success Criteria

The dry run succeeds if a judge can understand the product without explanation.

They should see:

- A website being analyzed
- GTM context streaming in
- Sources being searched
- Opportunities appearing live
- Drafts ready for human approval
- A clear recurring agent/email loop

## Current Implementation Status

The dry-run frontend is implemented as a Next.js app.

Current state:

- Landing page URL input starts the demo run.
- Onboarding uses a browser-style preview pointed at the real Salon Agent website.
- The live iframe is rendered at desktop viewport width and scaled into the preview so the page appears in desktop layout.
- The iframe performs fast page-down style jumps as the agent moves through page sections.
- A fallback simulated website preview is available from the preview chrome if iframe embedding fails.
- GTM schema answers stream into the right-side panel with confidence, source hints, and suggestion chips.
- Discovery uses a calmer review-deck layout instead of a dense three-column dashboard.
- Comment opportunities, original post ideas, and competitive insights stream into an incoming queue.
- The selected opportunity has a focused review panel with rationale, fit/risk, suggested action, draft, rewrite variants, copy, and open actions.
- The Post now action is wired to the local browser companion through `/api/browser/post-comment`.
- Simple Icons are used for source logos, lucide icons are used for interface actions, and Framer Motion drives staged transitions.
- The homepage now has a Dry Run / Real Mode toggle.
- `/api/research/run` streams NDJSON research events for both seeded Dry Run support and live Real Mode.
- Real Mode uses Exa for website/source content and structured OpenAI calls for GTM profile/search generation and opportunity extraction.
- Live opportunities are adapted into the same review cards as the dry run, so browser-use actions continue to receive `url`, `draft`, and `opportunityId`.
- The OpenAI-backed web researcher path has been smoke-tested with a cited research artifact at [research/2026-04-30-web-nextjs-turbopack.md](research/2026-04-30-web-nextjs-turbopack.md).
- Browser missions now run through the local Edge/Chrome CDP relay with orchestrator, browser-agent, relay, and CDP logs. See [browser-use.md](browser-use.md).
- A Supabase schema exists for product profiles, runs, events, source results, opportunities, drafts, and feedback.

Verification completed:

- `npm run lint`
- `npm run build`
- `npm run test:exa`
- `npm run test:web-researcher`
- `npm run dev:local`
- `npm run browser:mission -- --mission "do something fun on the browser for me surprise me" --start-url "https://neal.fun/" --max-turns 35`

Latest Real Mode smoke result: `gpt-5.4-nano` with low reasoning streamed the first chunk in 12ms and completed a live OpenAI docs run in about 29 seconds with 5 opportunity cards.

## Deadline Priorities

With roughly 2.5 hours left, the highest-leverage next steps are:

1. Run through the demo script end to end and tune timing.
2. Confirm the iframe behaves reliably on the presentation machine.
3. Add one screenshot-quality polish pass: spacing, text scale, and selected-card hierarchy.
4. Tune Real Mode prompts and source volume only if the demo needs more specific cards.
5. Prepare the two-minute judge narration around URL input, live site reading, streamed GTM profile, streamed opportunities, and human approval.
