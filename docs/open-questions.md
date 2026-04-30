# Product Decisions And Open Questions

## Answered

- The first product should include both comment opportunities and original post suggestions.
- Sources should include Reddit, Hacker News, GitHub issues, X, and web search where feasible.
- Competitive intelligence is part of onboarding, not only a later workflow.
- Onboarding should start with only a URL.
- The agent should infer a schema of GTM questions and answers, then ask for only missing useful context.
- Context added by the user should be used by every agent.
- The agent experience should stream progress and opportunity cards live.
- The first build should prioritize a polished dry-run front end so there is something strong to demo quickly.
- Resend should email the user when a new opportunity or post suggestion needs approval.
- The hackathon version is single-user.
- Supabase is acceptable for database and auth.
- GitHub issues can use the free GitHub API.
- Reddit, X, and broad web/social research can be handled through the provided web researcher agent or xAI search first.
- Apify and RapidAPI are fallback options, not the primary plan.
- The researcher agent has a dynamic schema and will be provided later.
- Scoring and dedupe can be designed by the implementation team.
- Dedupe should use prior feed context and model judgment, not an overbuilt system in MVP.

## Remaining Product Scope

- What exact demo product should dry run use: BeamBell, Salon Agent, or another niche example?
- What should the first opportunity card designs look like for comment opportunities versus original post suggestions?
- How much of the inferred GTM profile should be shown before the first streamed opportunities appear?

## Research Agent Integration

- What does the existing web researcher agent output today?
- Is it prompt-only, code-based, tool-based, or tied to another framework?
- Does it already use Exa?
- Does it produce citations and source links reliably?
- What tool-call interface should it use to write directly into Supabase?

## Ranking

- What exact scoring labels should be visible in the UI?
- What threshold should trigger a Resend approval email?
- What user feedback should be captured in MVP beyond accept, edit, copy, and dismiss?

## Notifications

- Should emails include full drafts, or summaries with links back to the app?
- What sender identity and domain should Resend use?

## Infrastructure

- Should hourly runs process all active profiles in one cron route, or a bounded batch per invocation?

## Human Review

- Do we only draft copy for manual posting, or also track where the user posted and what happened?
- How explicit should affiliation disclosure be in generated drafts?
