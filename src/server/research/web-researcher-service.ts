import type {
  ResearchMode,
  SourceReference,
  VerifiedResearchReport,
} from "@/lib/research/types";
import {
  RESEARCH_PROMPT_VERSION,
  VERIFIED_WEB_RESEARCH_SYSTEM_PROMPT,
} from "./prompts";
import { getSeededResearchReport } from "./seeded-research";
import { fetchUrlContent, searchWeb } from "./web-search";

type WebResearcherInput = {
  mission: string;
  topic: string;
  requiredDetails?: string[];
  outputGuidance?: string;
  mode: ResearchMode;
};

type OpenAIResponsesResponse = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
};

const researchReportJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    content: {
      type: "string",
      description: "Verified research findings with unverified details marked inline.",
    },
    sources: {
      type: "array",
      items: { type: "string" },
      description: "Source URLs used for the report.",
    },
    limitations: {
      type: "string",
      description: "What could not be verified or accessed.",
    },
  },
  required: ["content", "sources", "limitations"],
};

export class WebResearcherService {
  async research(input: WebResearcherInput): Promise<{
    report: VerifiedResearchReport;
    sources: SourceReference[];
  }> {
    const searched = await searchWeb(input.topic);
    const fetched = await fetchUrlContent(searched.slice(0, 5).map((r) => r.url));
    const sources = mergeSources(searched, fetched);
    const searchedQueries = [input.topic];

    if (
      input.mode === "demo" ||
      !process.env.OPENAI_API_KEY ||
      sources.length === 0
    ) {
      return {
        report: getSeededResearchReport(searchedQueries),
        sources,
      };
    }

    const model = process.env.OPENAI_MODEL || "gpt-5.4-mini";
    const report = await this.generateReport(input, sources, model);

    return {
      report:
        report ??
        getSeededResearchReport(searchedQueries),
      sources,
    };
  }

  private async generateReport(
    input: WebResearcherInput,
    sources: SourceReference[],
    model: string,
  ): Promise<VerifiedResearchReport | null> {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        reasoning: {
          effort: "low",
        },
        input: [
          {
            role: "system",
            content: VERIFIED_WEB_RESEARCH_SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: buildUserPrompt(input, sources),
          },
        ],
        text: {
          verbosity: "low",
          format: {
            type: "json_schema",
            name: "verified_research_report",
            strict: true,
            schema: researchReportJsonSchema,
          },
        },
      }),
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as OpenAIResponsesResponse;
    const content = extractResponseText(data);
    if (!content) return null;

    try {
      const parsed = JSON.parse(content) as {
        content?: unknown;
        sources?: unknown;
        limitations?: unknown;
      };

      if (
        typeof parsed.content !== "string" ||
        !Array.isArray(parsed.sources) ||
        !parsed.sources.every((source) => typeof source === "string")
      ) {
        return null;
      }

      return {
        content: parsed.content,
        sources: parsed.sources,
        limitations:
          typeof parsed.limitations === "string" ? parsed.limitations : undefined,
        metadata: {
          mode: input.mode,
          promptVersion: RESEARCH_PROMPT_VERSION,
          model,
          searchedQueries: [input.topic],
        },
      };
    } catch {
      return null;
    }
  }
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

function buildUserPrompt(input: WebResearcherInput, sources: SourceReference[]) {
  const requiredDetails = input.requiredDetails?.length
    ? input.requiredDetails.map((detail) => `- ${detail}`).join("\n")
    : "- Preserve source-backed GTM facts, buyer pains, competitors, and market signals.";

  return `## Research Mission

Goal: ${input.mission}

Topic: ${input.topic}

Required details:
${requiredDetails}

Output guidance: ${input.outputGuidance ?? "Return concise source-backed findings."}

Sources:
${sources
  .map(
    (source, index) => `[${index + 1}] ${source.title}
URL: ${source.url}
Preview: ${source.fetchedContent || source.snippet}`,
  )
  .join("\n\n")}`;
}

function mergeSources(
  searched: SourceReference[],
  fetched: SourceReference[],
): SourceReference[] {
  const byUrl = new Map<string, SourceReference>();

  for (const source of searched) {
    byUrl.set(source.url, source);
  }

  for (const source of fetched) {
    byUrl.set(source.url, {
      ...(byUrl.get(source.url) ?? source),
      ...source,
    });
  }

  return Array.from(byUrl.values());
}
