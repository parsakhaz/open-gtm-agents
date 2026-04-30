import type { OpportunityCard, SchemaSection } from "@/lib/dry-run/types";
import type {
  GTMProfileField,
  ResearchOpportunity,
  SourceReference,
} from "@/lib/research/types";

export function profileFieldToSchemaSection(field: GTMProfileField): SchemaSection {
  return {
    id: field.id,
    label: field.label,
    answer: field.value,
    confidence: field.confidence,
    source: field.source,
    suggestions: field.suggestions,
  };
}

export function researchOpportunityToCard(
  opportunity: ResearchOpportunity,
  sources: SourceReference[] = [],
): OpportunityCard {
  const evidenceUrl = opportunity.evidence.find((item) => isSpecificUrl(item.url))?.url;
  const cardUrl = isSpecificUrl(opportunity.url)
    ? opportunity.url
    : evidenceUrl || opportunity.url;
  const source = sources.find((item) => item.url === cardUrl) ?? sources.find((item) => item.url === opportunity.url);
  const firstEvidence = opportunity.evidence[0];

  return {
    id: opportunity.id,
    type: opportunity.type,
    source: opportunity.source,
    title: opportunity.title,
    location: opportunity.location,
    url: cardUrl,
    sourceContent: {
      body:
        firstEvidence?.quote ||
        source?.fetchedContent?.slice(0, 700) ||
        source?.snippet ||
        firstEvidence?.note ||
        opportunity.rationale,
      context: source?.title || firstEvidence?.note || opportunity.location,
    },
    rationale: opportunity.rationale,
    action: opportunity.suggestedAction,
    draft: opportunity.draft,
    fit: opportunity.fitScore,
    risk: opportunity.riskScore,
    reasoning:
      opportunity.evidence.length > 0
        ? opportunity.evidence.map((item) => item.note)
        : [opportunity.rationale],
    variants: opportunity.variants,
  };
}

function isSpecificUrl(url: string) {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/\/+$/, "");
    return path.length > 0 && path !== "/";
  } catch {
    return false;
  }
}
