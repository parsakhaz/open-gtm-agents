import {
  demoUrl,
  opportunities,
  schemaSections,
} from "@/lib/dry-run/demo-data";
import type {
  GTMProfileField,
  ResearchOpportunity,
  SourceReference,
  SourceSearch,
  VerifiedResearchReport,
} from "@/lib/research/types";
import { RESEARCH_PROMPT_VERSION } from "./prompts";

export const seededWebsiteUrl = demoUrl;

export const seededProfileFields: GTMProfileField[] = schemaSections.map(
  (section) => ({
    id: section.id,
    label: section.label,
    value: section.answer,
    confidence: section.confidence,
    source: section.source,
    suggestions: section.suggestions,
  }),
);

export const seededSourceSearches: SourceSearch[] = [
  {
    source: "reddit",
    query: "salon missed calls receptionist alternative",
  },
  {
    source: "x",
    query: "AI receptionist local business salon",
  },
  {
    source: "hacker_news",
    query: "AI agents local businesses missed revenue",
  },
  {
    source: "github",
    query: "booking SMS missed call issue",
  },
  {
    source: "web",
    query: "salon answering service booking follow up",
  },
];

export const seededSources: SourceReference[] = opportunities.map((card) => ({
  id: `source-${card.id}`,
  source: card.source === "resend" ? "web" : card.source,
  title: card.title,
  url: card.url,
  snippet: card.rationale,
}));

export const seededOpportunities: ResearchOpportunity[] = opportunities.map(
  (card) => ({
    id: card.id,
    type: card.type,
    source: card.source === "resend" ? "web" : card.source,
    title: card.title,
    location: card.location,
    url: card.url,
    rationale: card.rationale,
    suggestedAction: card.action,
    draft: card.draft,
    fitScore: card.fit,
    riskScore: card.risk,
    evidence: [
      {
        url: card.url,
        note: card.rationale,
      },
    ],
    variants: card.variants,
  }),
);

export function getSeededResearchReport(
  searchedQueries = seededSourceSearches.map((search) => search.query),
): VerifiedResearchReport {
  return {
    content:
      "Salon Agent is positioned around missed-call recovery for appointment-based beauty businesses. The strongest GTM signals are salon owners asking how to handle inbound calls while staff are with clients, broader AI receptionist discussion for local businesses, technical booking/SMS fallback workflows, and competitive positioning against generic answering services.",
    sources: seededSources.map((source) => source.url),
    limitations:
      "Seeded demo research is deterministic and should be replaced by live source fetches when credentials are configured.",
    metadata: {
      mode: "demo",
      promptVersion: RESEARCH_PROMPT_VERSION,
      searchedQueries,
    },
  };
}
