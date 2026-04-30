# Open GTM Agents

Open GTM Agents helps founders and teams find the right moments to be useful online.

The product starts from a simple input: a landing page. From there, it builds a working GTM profile, identifies unanswered context, and turns public market signals into a recurring stream of high-intent opportunities to comment, post, learn, and compete.

The goal is not to automate spam. The goal is to make thoughtful, well-timed GTM work easier to repeat.

## What It Does

Open GTM Agents monitors public conversations and market activity for moments where a product can be genuinely helpful. It should support both comment opportunities and original post suggestions from day one.

It looks for things like:

- People asking for alternatives to existing products
- Users complaining about competitor limitations
- Communities discussing problems the product solves
- Launches, comments, and threads where the product's perspective is relevant
- New competitors, positioning shifts, and repeated market complaints

The agent then ranks opportunities, explains why they matter, and drafts responses or post ideas for human review. When new opportunities are found, the user can be notified by email so they can respond while the conversation is still fresh.

The product can be organized around specialized agents:

- Comment Opportunity Agent: finds places to reply usefully.
- Original Post Agent: suggests posts the user should write based on observed demand.
- Competitive Intelligence Agent: runs during onboarding and later research to understand alternatives, gaps, and market movement.

## Core Belief

Most social listening tools are built around dashboards, mentions, alerts, and sentiment.

Open GTM Agents is built around action.

The useful question is not only "who mentioned us?" It is:

> Where is our audience already talking about the problem we solve, and how can we show up in a way that is useful?

## Onboarding

The primary onboarding flow starts with only the user's landing page.

1. The user enters their website.
2. The system fetches and reads the site as the primary source of truth.
3. The system infers a GTM profile from the available content.
4. The user reviews what was inferred and fills only the important gaps.
5. Each editable section includes expert suggestions the user can add with one click.

The experience should feel less like filling out a form and more like reviewing a smart first draft of the company's go-to-market context. The inferred context becomes shared context for every agent.

For the hackathon experience, onboarding should be visual and live. The user should see the agent working through stages as they happen: reading the website, inferring the profile, generating search angles, searching sources, ranking opportunities, and drafting comments.

The first build should start with a high-quality dry-run mode. Dry run mode should wire the full front-end experience and stream realistic agent progress, profile updates, and opportunity cards before every external integration is complete.

## GTM Profile

The inferred profile should capture:

- Product name and description
- Target customers and excluded audiences
- Problems solved and common trigger phrases
- Differentiators and positioning
- Competitors and alternatives
- Communities and sources to monitor
- Search phrases and discovery patterns
- Good-fit and bad-fit opportunity criteria
- Tone, disclosure style, and engagement boundaries

Each field can be inferred with confidence. High-confidence fields are shown for review. Low-confidence fields become focused follow-up questions.

## Dynamic Questions

The system should only ask questions that materially improve the agent's ability to find and prioritize opportunities. Those questions should come from a simple schema of GTM context fields that the agents use later.

Examples:

- "Are you mainly targeting solo operators, founders, or teams?"
- "Should we position directly against these competitors, or avoid direct comparison?"
- "Should we prioritize open-source communities, buyer-intent discussions, or competitor complaints?"

Every field the user can improve should include two or three suggested additions generated from a GTM expert perspective.

## Live Opportunity Discovery

The primary output is an opportunity inbox that updates as the agent finds useful moments.

Each item should include:

- Source and link
- Summary of the conversation
- Why it is relevant
- Suggested action
- Draft comment or post
- Fit score
- Risk score
- Notes on platform norms

The user should be able to approve, edit, copy, dismiss, or teach the system why the item was not useful.

The interface should stream opportunities into the page one by one instead of waiting for the full research run to finish. The agent's progress should be visible through status updates and source activity. Visual quality matters for the hackathon, so the live run page should be treated as a core product surface.

Example stages:

- Reading website
- Inferring GTM profile
- Generating search angles
- Searching Reddit, X, Hacker News, GitHub issues, and the web
- Evaluating fit and risk
- Drafting suggested comments
- Sending email alerts for meaningful new opportunities

## Hourly Agent

After onboarding, the agent should run every hour.

The recurring workflow should:

1. Look up active product profiles.
2. Search configured sources for new relevant conversations.
3. Dedupe against previous opportunities.
4. Score relevance, freshness, intent, risk, and novelty.
5. Save high-quality opportunities.
6. Email the user when there is something worth acting on quickly.

Email should be reserved for meaningful deltas, not every run.

When an opportunity needs user approval, Resend should email the user. The email is an urgency layer; the app remains the approval and review surface.

## Human Review

Public engagement should stay human-approved by default.

Open GTM Agents can draft and recommend, but it should not silently post to communities where trust, norms, and account safety matter. The product should help users be useful, transparent, and specific.

## Competitive Intelligence

The same market-sensing system should also support competitive intelligence.

It can track:

- New competitors and adjacent products
- Platform support and feature differences
- Positioning changes
- Pricing and packaging changes
- Repeated customer complaints
- Threads asking for alternatives
- Mentions across communities and launch channels

Competitive intelligence and social listening should share the same underlying product profile, memory, and source monitoring.

## Product Direction

Open GTM Agents is inspired by social listening products such as Octolens, but the product should be agent-native from the start.

That means it should:

- Build and maintain context over time
- Ask targeted follow-up questions
- Explain its reasoning
- Learn from user feedback
- Turn signals into recommended actions
- Run recurring workflows without requiring the user to rebuild context

The first version should focus on a narrow, high-quality loop:

1. Understand the product from the landing page.
2. Build a draft GTM profile.
3. Ask only the highest-leverage missing questions.
4. Run a polished dry-run mode that demonstrates the full live experience.
5. Stream comment and post opportunities into a live run view.
6. Continue researching every hour.
7. Email the user when there are high-quality new opportunities needing approval.
8. Draft helpful responses for human approval.
9. Learn from what the user accepts, edits, or rejects.

## Technical Direction

The first build should prioritize speed and a polished demo experience.

Current stack direction:

- Vercel Pro for hosting, functions, cron, and deployment
- Next.js for the web app
- Vercel AI SDK for model calls, structured outputs, and streaming
- OpenAI as the model provider
- Exa for landing page ingestion, web search, and source content
- Supabase for Postgres, auth, run state, and later vector search
- Resend for email notifications
- Internal web researcher service for broad web and social research
- GitHub APIs for issue and repository search
- Hacker News public APIs for Hacker News search
- Apify or RapidAPI only if needed as a fallback for source access

See [docs/technical-architecture.md](docs/technical-architecture.md) for the working architecture.

See [docs/dry-run-demo.md](docs/dry-run-demo.md) for the dry-run user journeys, judge pitch flow, and frontend-first demo plan.

## Current Build Status

The hackathon dry run is implemented as a Next.js frontend.

It includes:

- One-URL demo start flow
- Real Salon Agent iframe preview with desktop scaling
- Page-down style website navigation during onboarding
- Streaming GTM schema answers
- Source logos via Simple Icons
- lucide interface icons
- Framer Motion transitions
- Streamed comment opportunities, original post ideas, and competitive insights
- Focused review deck with rewrite/copy/open actions
- Seeded and OpenAI-backed research API route
- Supabase client helpers
- Supabase schema applied to the linked remote project
- Vercel production deployment with OpenAI and Supabase environment variables

Verified with:

- `npm run lint`
- `npm run build`
- `npm run test:web-researcher`

## Local Development

Use the cross-platform runner when testing the dry-run UI and browser companion together:

```bash
npm run dev:local
```

By default it:

- pulls `.env.local` from the linked Vercel development environment when the file is missing
- starts Next.js at `http://127.0.0.1:3000`
- starts the Electron browser companion relay at `http://127.0.0.1:4123`
- keeps the browser posting model from `.env.local`, currently `OPENAI_MODEL=gpt-5.4-mini`

Useful options:

```bash
npm run dev:local -- --port 3003
npm run dev:local -- --env pull
npm run dev:local -- --desktop false
VERCEL_PROJECT=open-gtm-agents VERCEL_SCOPE=parsas npm run dev:local
```
