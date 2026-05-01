import { debugLog, previewForLog } from "@/lib/debug-log";
import type {
  GTMProfileField,
  ResearchOpportunity,
  ResearchSourceId,
  SourceReference,
  SourceSearch,
  VerifiedResearchReport,
} from "@/lib/research/types";
import {
  GTM_RESEARCH_ORCHESTRATOR_SYSTEM_PROMPT,
  OPPORTUNITY_EXTRACTION_SYSTEM_PROMPT,
} from "./prompts";
import { withProviderRetry } from "./provider-retry";

type OpenAIResponsesResponse = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
};

type LiveGtmPlan = {
  profileFields: GTMProfileField[];
  searches: SourceSearch[];
};

const sourceIds: ResearchSourceId[] = ["reddit", "x", "hacker_news", "github", "web"];

const gtmPlanSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    profileFields: {
      type: "array",
      minItems: 4,
      maxItems: 7,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          label: { type: "string" },
          value: { type: "string" },
          confidence: { type: "number" },
          source: { type: "string" },
          suggestions: { type: "array", items: { type: "string" } },
        },
        required: ["id", "label", "value", "confidence", "source", "suggestions"],
      },
    },
    searches: {
      type: "array",
      minItems: 10,
      maxItems: 15,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          source: { type: "string", enum: sourceIds },
          query: { type: "string" },
        },
        required: ["source", "query"],
      },
    },
  },
  required: ["profileFields", "searches"],
};

const opportunitySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    opportunities: {
      type: "array",
      minItems: 3,
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          type: { type: "string", enum: ["comment", "post", "competitive"] },
          source: { type: "string", enum: sourceIds },
          title: { type: "string" },
          location: { type: "string" },
          url: { type: "string" },
          rationale: { type: "string" },
          suggestedAction: { type: "string" },
          draft: { type: "string" },
          fitScore: { type: "number" },
          riskScore: { type: "number" },
          evidence: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                url: { type: "string" },
                note: { type: "string" },
                quote: { type: "string" },
              },
              required: ["url", "note", "quote"],
            },
          },
          variants: {
            type: "object",
            additionalProperties: false,
            properties: {
              shorter: { type: "string" },
              softer: { type: "string" },
              technical: { type: "string" },
              direct: { type: "string" },
            },
            required: ["shorter", "softer", "technical", "direct"],
          },
        },
        required: [
          "id",
          "type",
          "source",
          "title",
          "location",
          "url",
          "rationale",
          "suggestedAction",
          "draft",
          "fitScore",
          "riskScore",
          "evidence",
          "variants",
        ],
      },
    },
  },
  required: ["opportunities"],
};

export async function generateLiveGtmPlan(input: {
  websiteUrl: string;
  websiteSources: SourceReference[];
  model: string;
  scanDays?: number;
}): Promise<LiveGtmPlan> {
  const content = await callStructuredOpenAI({
    model: input.model,
    operation: "GTM profile and searches",
    schemaName: "live_gtm_plan",
    schema: gtmPlanSchema,
    systemPrompt: GTM_RESEARCH_ORCHESTRATOR_SYSTEM_PROMPT,
    userPrompt: `Build a GTM profile and broad external research missions for this website.

Act like a senior GTM researcher. Create 10 to 15 concise external research missions, not one broad blended query. Give the web researcher room to explore buyer pain, competitors, alternatives, community discussions, and operational intent.

Freshness window: prioritize opportunities from the last ${input.scanDays ?? 14} days. Search missions should make sense for finding fresh posts that are still natural to reply to.

Prioritize real people and comment opportunities from Reddit, Hacker News, X/Twitter, LinkedIn, GitHub discussions/issues, forums, Q&A sites, and review/community threads. Avoid vendor blogs, marketing pages, homepages, pricing pages, SEO articles, and product pages unless the mission is explicitly competitive comparison. Do not search the submitted website itself. Do not include the product brand name unless the mission is explicitly competitive/review research. Do not use site: queries for the submitted domain.

Cover multiple platforms. Include several missions for high-signal community surfaces, especially Reddit, Hacker News, GitHub, X/Twitter, and broad web/forum search. Each mission will be executed as a separate Exa search, so make each one specific enough to retrieve a different slice of the market.

Website URL: ${input.websiteUrl}

Website content:
${formatSources(input.websiteSources, 5000)}`,
  });

  const parsed = JSON.parse(content) as LiveGtmPlan;
  return {
    profileFields: parsed.profileFields.map(normalizeProfileField),
    searches: parsed.searches
      .filter((search) => sourceIds.includes(search.source))
      .map((search) => ({
        source: search.source,
        query: search.query.trim(),
      })),
  };
}

export async function extractLiveOpportunities(input: {
  websiteUrl: string;
  profileFields: GTMProfileField[];
  searches: SourceSearch[];
  report?: VerifiedResearchReport;
  sources: SourceReference[];
  model: string;
  scanDays?: number;
}): Promise<ResearchOpportunity[]> {
  const content = await callStructuredOpenAI({
    model: input.model,
    operation: "opportunity extraction",
    schemaName: "live_opportunities",
    schema: opportunitySchema,
    systemPrompt: OPPORTUNITY_EXTRACTION_SYSTEM_PROMPT,
    userPrompt: `Create 3 to 5 useful, human-reviewable GTM opportunities.

Website URL: ${input.websiteUrl}

GTM profile:
${input.profileFields.map((field) => `- ${field.label}: ${field.value}`).join("\n")}

Searches:
${input.searches.map((search) => `- ${search.source}: ${search.query}`).join("\n")}

Verified report:
${input.report?.content ?? "Use the fetched source previews and content below as the evidence base."}

URL rule:
Every opportunity URL must be a specific source URL from the source list when possible. Do not use a broad homepage like reddit.com, x.com, github.com, or news.ycombinator.com if a specific thread, post, issue, discussion, or article URL is available.

Quality and diversity rules:
- Prefer real people describing a problem, asking for recommendations, comparing alternatives, or sharing an operational workaround.
- Prefer fresh threads/posts from the last ${input.scanDays ?? 14} days. Avoid old/stale posts unless the source list has no better fresh opportunities.
- Do not create multiple opportunity cards from the same URL unless the source contains clearly separate, high-value angles and there are no other good sources.
- Use at least 3 distinct source URLs when the source list supports it. If there are 3 or more eligible source URLs, return at least 3 opportunities.
- Prefer community/forum/social/issue sources over vendor blogs, SEO articles, and product marketing pages.
- If a source has a qualityScore or qualityReasons, use them as ranking hints, not as the only evidence.

Sources:
${formatSources(input.sources, 6000)}`,
  });

  const parsed = JSON.parse(content) as { opportunities: ResearchOpportunity[] };
  return dedupeOpportunitiesByUrl(
    parsed.opportunities.map((opportunity) => normalizeOpportunity(opportunity, input.sources)),
  );
}

async function callStructuredOpenAI(input: {
  model: string;
  operation: string;
  schemaName: string;
  schema: Record<string, unknown>;
  systemPrompt: string;
  userPrompt: string;
}) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required for live GTM generation.");
  }

  return withProviderRetry(
    { provider: "OpenAI", operation: input.operation },
    async () => {
      debugLog("live-gtm", "OpenAI structured request", {
        model: input.model,
        operation: input.operation,
        reasoningEffort: researchReasoningEffort(),
      });
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: input.model,
          reasoning: {
            effort: researchReasoningEffort(),
          },
          input: [
            { role: "system", content: input.systemPrompt },
            { role: "user", content: input.userPrompt },
          ],
          text: {
            verbosity: "low",
            format: {
              type: "json_schema",
              name: input.schemaName,
              strict: true,
              schema: input.schema,
            },
          },
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`OpenAI ${input.operation} failed: ${response.status} ${body.slice(0, 500)}`);
      }

      const data = (await response.json()) as OpenAIResponsesResponse;
      const text = extractResponseText(data);
      if (!text) {
        throw new Error(`OpenAI ${input.operation} returned no output text.`);
      }

      try {
        JSON.parse(text);
      } catch (error) {
        debugLog("live-gtm", "OpenAI structured parse failed", {
          operation: input.operation,
          error: previewForLog(error instanceof Error ? error.message : error, 300),
          output: previewForLog(text, 500),
        }, "warn");
        throw error;
      }

      return text;
    },
  );
}

function normalizeProfileField(field: GTMProfileField): GTMProfileField {
  return {
    ...field,
    id: slugId(field.id || field.label),
    confidence: clampScore(field.confidence),
    suggestions: field.suggestions.slice(0, 5),
  };
}

function formatSources(sources: SourceReference[], maxChars: number) {
  const text = sources
    .map(
      (source, index) => `[${index + 1}] ${source.title}
URL: ${source.url}
Source: ${source.source}
Published: ${source.publishedAt ?? "unknown"}
Quality: ${source.qualityScore ?? "unscored"} ${source.qualityReasons?.length ? `(${source.qualityReasons.join("; ")})` : ""}
Preview: ${source.fetchedContent || source.snippet}`,
    )
    .join("\n\n");

  return text.length > maxChars ? `${text.slice(0, maxChars)}\n[truncated]` : text;
}

function extractResponseText(response: OpenAIResponsesResponse) {
  if (response.output_text) {
    return response.output_text;
  }

  for (const item of response.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && content.text) {
        return content.text;
      }
    }
  }

  return undefined;
}

function slugId(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || crypto.randomUUID();
}

function clampScore(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalizeOpportunity(
  opportunity: ResearchOpportunity,
  sources: SourceReference[],
): ResearchOpportunity {
  const specificEvidenceUrl = opportunity.evidence.find((item) => isSpecificUrl(item.url))?.url;
  const sourceUrl = sources.find((source) => isSpecificUrl(source.url))?.url;
  const url = isSpecificUrl(opportunity.url)
    ? opportunity.url
    : specificEvidenceUrl || sourceUrl || opportunity.url;

  return {
    ...opportunity,
    id: slugId(opportunity.id || opportunity.title),
    source: sourceIds.includes(opportunity.source) ? opportunity.source : "web",
    url,
    evidence: opportunity.evidence.length
      ? opportunity.evidence.map((item, index) => ({
          ...item,
          url: isSpecificUrl(item.url) ? item.url : index === 0 ? url : item.url,
        }))
      : [{ url, note: opportunity.rationale, quote: "" }],
    fitScore: clampScore(opportunity.fitScore),
    riskScore: clampScore(opportunity.riskScore),
    variants: {
      shorter: opportunity.variants.shorter || opportunity.draft,
      softer: opportunity.variants.softer || opportunity.draft,
      technical: opportunity.variants.technical || opportunity.draft,
      direct: opportunity.variants.direct || opportunity.draft,
    },
  };
}

function dedupeOpportunitiesByUrl(opportunities: ResearchOpportunity[]) {
  const byUrl = new Map<string, ResearchOpportunity>();

  for (const opportunity of opportunities) {
    const key = canonicalOpportunityUrl(opportunity.url);
    const existing = byUrl.get(key);
    if (!existing || opportunity.fitScore - opportunity.riskScore > existing.fitScore - existing.riskScore) {
      byUrl.set(key, opportunity);
    }
  }

  return Array.from(byUrl.values()).slice(0, 5);
}

function canonicalOpportunityUrl(url: string) {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    parsed.search = "";
    return parsed.toString().replace(/\/+$/, "");
  } catch {
    return url.trim().toLowerCase();
  }
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

function researchReasoningEffort() {
  const effort = process.env.OPENAI_RESEARCH_REASONING_EFFORT || "high";
  return ["minimal", "low", "medium", "high"].includes(effort) ? effort : "low";
}
