import type { DryRunEvent, OpportunityCard, SchemaSection, WebsiteSection } from "./types";

export const demoUrl = "https://www.salonagent.ai/";

export const websiteSections: WebsiteSection[] = [
  {
    id: "navigation",
    label: "Navigation",
    eyebrow: "Site map",
    headline: "SalonAgent.ai",
    body: "A focused landing page for salons that lose clients when calls go unanswered.",
    bullets: ["Home", "About", "Features", "Reviews", "Pricing", "Contact"],
  },
  {
    id: "hero",
    label: "Hero",
    eyebrow: "Primary promise",
    headline: "Most salons don't lose clients. They just couldn't answer the phone.",
    body: "Salon Agent positions around missed calls, late-night bookings, and SMS follow-up for beauty businesses.",
    bullets: ["Answers missed calls", "Books clients by text", "Captures late-night demand"],
    cta: "Add AI to your salon",
  },
  {
    id: "how-it-works",
    label: "How it works",
    eyebrow: "Workflow",
    headline: "Turns every missed call into a text conversation.",
    body: "The product behaves like a front-desk assistant that responds instantly and routes clients toward booking.",
    bullets: ["Detect missed call", "Send personalized SMS", "Collect intent", "Book or hand off"],
  },
  {
    id: "social-proof",
    label: "Social proof",
    eyebrow: "Trust",
    headline: "Built for busy salon owners who cannot answer every call.",
    body: "The proof points focus on responsiveness, recovered bookings, and lower operational burden.",
    bullets: ["No receptionist required", "Works after hours", "Keeps conversation history"],
  },
  {
    id: "stats",
    label: "Stats section",
    eyebrow: "Market pain",
    headline: "Calls are still the highest-intent salon lead.",
    body: "The site frames phone response time as the conversion gap for local service businesses.",
    bullets: ["High-intent inbound demand", "Staff are busy with clients", "Speed-to-lead wins"],
  },
  {
    id: "footer",
    label: "Footer CTA",
    eyebrow: "Conversion",
    headline: "Recover bookings while your stylists stay focused.",
    body: "The final CTA gives the agent a clear target audience and pain to search for.",
    bullets: ["Salon owners", "Beauty studios", "Appointment-based local services"],
    cta: "Start capturing missed calls",
  },
];

export const schemaSections: SchemaSection[] = [
  {
    id: "summary",
    label: "Product summary",
    answer:
      "Salon Agent is an AI phone and SMS assistant for salons. It helps recover missed calls, answer booking intent, and keep prospective clients moving toward an appointment.",
    confidence: 94,
    source: "Hero + CTA",
    suggestions: ["Mention after-hours leads", "Add SMS booking", "Emphasize no new staff"],
  },
  {
    id: "customer",
    label: "Target customer",
    answer:
      "Primary buyers are salon owners, studio managers, and independent beauty operators who receive calls while serving clients and cannot consistently answer the phone.",
    confidence: 89,
    source: "Hero + footer",
    suggestions: ["Multi-chair salons", "Solo stylists", "Med spas"],
  },
  {
    id: "pain",
    label: "Pain points",
    answer:
      "Missed calls become missed bookings. Staff cannot answer while with clients, leads call after hours, and slow follow-up pushes customers to competitors.",
    confidence: 96,
    source: "Hero copy",
    suggestions: ["No-show recovery", "Peak-hour call volume", "New client intake"],
  },
  {
    id: "competitors",
    label: "Competitors and alternatives",
    answer:
      "Alternatives include hiring a receptionist, generic answering services, salon booking platforms, call centers, and DIY automations with Twilio or Zapier.",
    confidence: 78,
    source: "Inferred market map",
    suggestions: ["Boulevard", "GlossGenius", "Answering services"],
  },
  {
    id: "differentiators",
    label: "Differentiators",
    answer:
      "The strongest angle is salon-specific speed-to-lead: respond instantly to missed calls with a booking-aware SMS workflow instead of a generic voicemail or intake form.",
    confidence: 86,
    source: "Hero + workflow",
    suggestions: ["Salon-native language", "Instant SMS", "After-hours capture"],
  },
  {
    id: "search",
    label: "Search angles",
    answer:
      "Look for posts about missed salon calls, front desk overload, no receptionist, late-night booking requests, appointment scheduling, and local service lead follow-up.",
    confidence: 91,
    source: "Synthesized from profile",
    suggestions: ["missed calls salon", "salon receptionist alternative", "after hours bookings"],
  },
  {
    id: "communities",
    label: "Communities and sources",
    answer:
      "Relevant places include Reddit salon owner threads, small business forums, local service marketing discussions, Hacker News founder conversations, GitHub issues for booking automations, and X posts about AI receptionists.",
    confidence: 82,
    source: "Market inference",
    suggestions: ["r/salonowners", "r/smallbusiness", "X local service operators"],
  },
  {
    id: "tone",
    label: "Engagement tone",
    answer:
      "Use practical operator language. Lead with the missed-call problem, disclose affiliation, and offer a helpful workflow idea before mentioning the product.",
    confidence: 88,
    source: "GTM expert prompt",
    suggestions: ["Transparent affiliation", "No hard sell", "Offer setup checklist"],
  },
  {
    id: "avoid",
    label: "Things to avoid",
    answer:
      "Avoid generic AI hype, claiming the product replaces all staff, posting in consumer beauty threads, or replying where the user is not asking for operational help.",
    confidence: 84,
    source: "Risk model",
    suggestions: ["No auto-posting", "Avoid consumer threads", "Do not mention competitors first"],
  },
];

export const opportunities: OpportunityCard[] = [
  {
    id: "reddit-missed-calls",
    type: "comment",
    source: "reddit",
    title: "How do you handle calls when everyone is with a client?",
    location: "r/salonowners",
    url: "https://reddit.com/r/salonowners/example",
    rationale:
      "The poster is describing the exact missed-call workflow Salon Agent solves and is asking for practical tools, not broad marketing advice.",
    action: "Reply with a transparent workflow suggestion and offer the product as one option.",
    draft:
      "I work on a tool in this space, so biased, but the pattern that works best is instant SMS after a missed call. Even a simple message like 'Sorry we missed you, are you looking to book or ask a pricing question?' catches a lot of demand before they call another salon.",
    fit: 94,
    risk: 18,
    variants: {
      shorter:
        "The highest-leverage fix is usually instant SMS after a missed call. Ask whether they want to book or ask a pricing question before they move on to another salon.",
      softer:
        "One lightweight option is to text back automatically after missed calls. It does not need to be pushy; just a quick booking/pricing question can recover a surprising amount of intent.",
      technical:
        "The workflow I would test is missed-call detection, SMS intent capture, and calendar handoff. You can build it manually with Twilio/Zapier or use a salon-specific assistant.",
      direct:
        "This is exactly why we built Salon Agent: missed-call SMS follow-up for salons that cannot answer while serving clients. Happy to share the workflow if useful.",
    },
  },
  {
    id: "x-ai-receptionist",
    type: "comment",
    source: "x",
    title: "AI receptionists are underrated for local businesses",
    location: "X search",
    url: "https://x.com/example/status/1",
    rationale:
      "The thread is already discussing local service AI receptionists, and salons are a concrete vertical example with obvious urgency.",
    action: "Add a specific salon use case and avoid sounding like a launch announcement.",
    draft:
      "Salons are a great example because the person answering the phone is often also with a client. The best AI receptionist use case is not replacing the front desk; it is catching the high-intent missed call and turning it into a booking text.",
    fit: 87,
    risk: 24,
    variants: {
      shorter:
        "Salons are the clearest example: high-intent calls arrive while staff are with clients. AI is useful when it turns missed calls into booking texts.",
      softer:
        "I think salons are an interesting vertical here. The value is less 'replace the front desk' and more 'catch the missed call before the lead goes elsewhere.'",
      technical:
        "The useful workflow is vertical-specific: missed-call trigger, SMS intent capture, service selection, and booking handoff.",
      direct:
        "We are building this for salons specifically. The wedge is missed-call recovery, not a generic AI receptionist.",
    },
  },
  {
    id: "hn-local-ai",
    type: "post",
    source: "hacker_news",
    title: "Original post idea: The best AI agent wedge is missed revenue, not automation",
    location: "Hacker News discussion",
    url: "https://news.ycombinator.com/item?id=example",
    rationale:
      "HN is discussing practical AI agents. A concrete salon missed-call case study would be more credible than a generic agent essay.",
    action: "Write a short founder post with the salon missed-call workflow as the example.",
    draft:
      "Post angle: 'We found a boring AI agent use case that local businesses immediately understand: missed calls.' Walk through why a salon lead has high intent, why staff cannot answer, and why SMS follow-up beats a generic chatbot.",
    fit: 81,
    risk: 32,
    variants: {
      shorter:
        "Post angle: AI agents work best when they recover obvious missed revenue. Salons missing phone calls are a clean example.",
      softer:
        "A useful post could explore why local service AI feels more practical when it starts with a narrow missed-revenue workflow.",
      technical:
        "Frame the post around event triggers, intent capture, and handoff instead of broad autonomy.",
      direct:
        "Write: 'The AI receptionist wedge is missed calls, not chatbots.' Use salons as the case study.",
    },
  },
  {
    id: "github-booking-issue",
    type: "comment",
    source: "github",
    title: "Issue: Need SMS fallback when booking request is missed",
    location: "open-source-booking/issues",
    url: "https://github.com/example/open-source-booking/issues/42",
    rationale:
      "A developer is discussing SMS fallback in a booking workflow. This is a technical path into the same pain, with lower promotional risk.",
    action: "Share the trigger-and-handoff pattern without pitching too hard.",
    draft:
      "A pattern that has worked for appointment businesses is to treat missed calls as a first-class booking event: trigger SMS, ask for service/date intent, then either create a booking request or hand off to staff.",
    fit: 76,
    risk: 16,
    variants: {
      shorter:
        "Treat the missed call as a booking event: trigger SMS, collect intent, then create a request or hand off to staff.",
      softer:
        "One workflow worth testing is missed-call to SMS intent capture before routing to booking or staff follow-up.",
      technical:
        "Model it as an event pipeline: missed_call.created -> sms.intent_capture -> booking_request.created -> staff_handoff.",
      direct:
        "We are exploring this for salons. The core pattern is missed-call event to SMS intent capture to booking handoff.",
    },
  },
  {
    id: "competitive-answering-service",
    type: "competitive",
    source: "web",
    title: "Competitor pattern: generic answering services are not booking-aware",
    location: "Web research",
    url: "https://example.com/answering-services",
    rationale:
      "Many alternatives answer phones but do not position around salon-specific booking intent, giving Salon Agent a sharper wedge.",
    action: "Use this in positioning and post ideas.",
    draft:
      "Positioning note: contrast generic answering with booking-aware missed-call recovery. The key line is 'not every missed call needs a receptionist; some need a booking flow.'",
    fit: 84,
    risk: 12,
    variants: {
      shorter:
        "Positioning: generic answering services answer calls; Salon Agent recovers booking intent.",
      softer:
        "A useful positioning angle is booking-aware follow-up instead of generic call handling.",
      technical:
        "Differentiate on domain-specific intent capture, not voice answering alone.",
      direct:
        "Lead with: 'Answering services take messages. Salon Agent turns missed calls into booking conversations.'",
    },
  },
];

export const dryRunEvents: DryRunEvent[] = [
  { type: "phase", at: 0, phase: "onboarding" },
  { type: "status", at: 100, stage: "Connecting", message: "Connecting to salonagent.ai." },
  { type: "onboarding_step", at: 700, step: "trust" },
  { type: "status", at: 700, stage: "Trust signals", message: "Checking source quality and site accessibility." },
  { type: "onboarding_step", at: 1500, step: "content" },
  { type: "status", at: 1500, stage: "Content", message: "Loading the page for analysis." },
  { type: "onboarding_step", at: 2400, step: "analysis" },
  { type: "status", at: 2500, stage: "Navigation", message: "Opening salonagent.ai and mapping the page structure." },
  { type: "website_focus", at: 2700, sectionId: "navigation", scrollTo: 0 },
  { type: "status", at: 3900, stage: "Hero", message: "Reading the primary promise and buyer pain." },
  { type: "website_focus", at: 4100, sectionId: "hero", scrollTo: 8 },
  { type: "schema_answer", at: 4700, sectionId: "summary" },
  { type: "schema_answer", at: 6100, sectionId: "customer" },
  { type: "website_focus", at: 6900, sectionId: "how-it-works", scrollTo: 28 },
  { type: "status", at: 7100, stage: "How it works", message: "Extracting the workflow behind missed-call recovery." },
  { type: "schema_answer", at: 7900, sectionId: "pain" },
  { type: "schema_answer", at: 9300, sectionId: "differentiators" },
  { type: "website_focus", at: 10100, sectionId: "social-proof", scrollTo: 48 },
  { type: "status", at: 10300, stage: "Social proof", message: "Looking for proof points and operator language." },
  { type: "schema_answer", at: 11300, sectionId: "competitors" },
  { type: "website_focus", at: 12300, sectionId: "stats", scrollTo: 68 },
  { type: "schema_answer", at: 12900, sectionId: "search" },
  { type: "schema_answer", at: 14100, sectionId: "communities" },
  { type: "website_focus", at: 14900, sectionId: "footer", scrollTo: 86 },
  { type: "schema_answer", at: 15500, sectionId: "tone" },
  { type: "schema_answer", at: 16500, sectionId: "avoid" },
  { type: "phase", at: 17900, phase: "discovery" },
  { type: "status", at: 18100, stage: "Search angles", message: "Turning the profile into platform-native searches." },
  { type: "source_search", at: 18900, source: "reddit", query: "salon missed calls receptionist alternative" },
  { type: "source_search", at: 19900, source: "x", query: "AI receptionist local business salon" },
  { type: "opportunity", at: 20900, cardId: "reddit-missed-calls" },
  { type: "source_search", at: 21900, source: "hacker_news", query: "AI agents local businesses missed revenue" },
  { type: "opportunity", at: 23100, cardId: "x-ai-receptionist" },
  { type: "source_search", at: 24100, source: "github", query: "booking SMS missed call issue" },
  { type: "opportunity", at: 25500, cardId: "hn-local-ai" },
  { type: "opportunity", at: 26900, cardId: "github-booking-issue" },
  { type: "source_search", at: 27900, source: "web", query: "salon answering service booking follow up" },
  { type: "opportunity", at: 29300, cardId: "competitive-answering-service" },
  { type: "status", at: 30700, stage: "Notify founder", message: "Packaging the best items into a short approval request." },
  { type: "phase", at: 32300, phase: "complete" },
];
