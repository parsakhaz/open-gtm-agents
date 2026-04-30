# Project Brief: Open GTM Agents

## Essence

Open GTM Agents is an agent-native social listening and GTM intelligence product.

A user gives the system their landing page. The system reads it, infers the company's GTM context, asks only the remaining high-value questions, and then runs recurring workflows that find useful places to comment, post, and learn from the market.

The product should help users show up where their audience already is, especially when people are discussing problems the product solves or limitations in competing products.

The first product experience should feel live. As the agent researches, the UI should stream progress and opportunities into the page instead of making the user wait for a final report. For the hackathon, visual quality is part of the product.

## Primary User

The initial user is likely a founder, indie hacker, developer-tool builder, open-source maintainer, or small GTM team that needs more distribution but does not want generic marketing automation.

They care about:

- Finding relevant conversations early
- Commenting in a way that feels useful
- Finding ideas for original posts
- Understanding competitors
- Learning where their audience spends time
- Turning market signals into repeatable GTM actions

## Product Thesis

Traditional social listening focuses on mentions, alerts, dashboards, and sentiment.

Open GTM Agents should focus on opportunities and action:

- Where should I show up?
- Why does this thread matter?
- What should I say?
- What should I avoid?
- What did we learn?

## Onboarding Flow

The first screen asks only for the user's landing page.

The system uses the website as the primary source of truth and fills in as much as it can:

- What the product is
- Who it is for
- What problems it solves
- What competitors or alternatives matter
- What communities and sources are likely relevant
- What search phrases indicate intent
- What kinds of posts or comments would be appropriate

The user then reviews the inferred profile and adds missing context. Additional context should be stored once and used by every agent.

The onboarding should be dynamic. If the system is confident, it should avoid asking. If something important is unclear, it should ask a focused question.

The profile should be represented as a schema of questions and answers. The agent fills the schema from research, then asks only for the remaining useful context.

The onboarding run should show visible agent progress:

- Reading website
- Inferring product and audience
- Finding likely competitors and alternatives
- Generating search angles
- Searching sources
- Drafting initial opportunity cards

Competitive intelligence is part of onboarding. The system should identify relevant alternatives and competitor gaps early because those findings shape both comment opportunities and original post suggestions.

## Suggested Inputs

Each editable answer should include two or three suggested additions generated from a GTM expert perspective.

These suggestions should be specific, not generic.

Example categories:

- Target customer segments
- Pain points
- Competitor names
- Positioning angles
- Communities to monitor
- Phrases that indicate intent
- Topics to avoid
- Preferred tone

## Recurring Workflow

The recurring agent should run every hour and produce an opportunity inbox.

There should be specialized agents or agent modes:

- Comment Opportunity Agent: finds conversations worth replying to.
- Original Post Agent: suggests posts the user should write based on market signals.
- Competitive Intelligence Agent: identifies competitors, alternatives, gaps, and repeated complaints.

It should look for:

- People asking for products like this
- Complaints about alternatives
- Feature gaps in competitors
- High-intent questions in relevant communities
- Launches and discussions where a useful comment would fit
- Broader posts the user could write in response to observed demand

For each opportunity, the system should provide:

- Link to the source
- Short explanation
- Relevance rationale
- Suggested action
- Draft response or post idea
- Fit and risk assessment

When the system finds meaningful new opportunities, it should email the user through Resend so they can respond quickly.

The email should be concise and action-oriented:

- What was found
- Why it matters
- Suggested action
- Link back to the opportunity inbox

Email should not fire for every run. It should fire when there are new, relevant, timely opportunities that need the user's approval.

## Engagement Principles

The product should protect the user from spammy behavior.

Default behavior:

- Draft, do not auto-post
- Encourage transparent affiliation
- Prefer specific helpfulness over promotion
- Recommend skipping low-fit opportunities
- Learn from user edits and rejections

For the first version, the product should help users manually comment or post. Official posting APIs for X, Reddit, and similar platforms are not required for the hackathon version. Source access can come from the provided web researcher agent, xAI search, Exa, Hacker News APIs, GitHub APIs, Apify, RapidAPI, or similar providers.

## Competitive Intelligence

Competitive intelligence should be treated as a sibling workflow, not a separate product.

The same profile and source monitoring can identify:

- New competitors
- Mentions of known competitors
- Pricing, packaging, and positioning changes
- User complaints
- Feature comparisons
- Alternative-seeking behavior

## Near-Term Shape

The first useful product should deliver:

- A polished dry-run mode that demonstrates the full front-end experience
- Landing page based GTM profile generation
- Dynamic follow-up questions
- Expert suggestion chips for user enrichment
- Live streamed opportunity discovery
- Original post suggestions
- Hourly research runs
- Resend email alerts when opportunities need approval
- Human-reviewed response drafting
- Feedback loop for accepted, edited, and rejected recommendations

The important product feeling is that the system does the heavy lifting first, then asks the user only for the context it could not responsibly infer.

For the hackathon, visual quality matters. The agent run should make progress visible and turn research into useful cards as soon as each card is ready. The dry-run front end should come first so there is always something compelling to show.
