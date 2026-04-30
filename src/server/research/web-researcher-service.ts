import { debugLog, durationMs, previewForLog } from "@/lib/debug-log";
import type {
  ResearchMode,
  SourceReference,
  VerifiedResearchReport,
} from "@/lib/research/types";
import {
  RESEARCH_PROMPT_VERSION,
  VERIFIED_WEB_RESEARCH_SYSTEM_PROMPT,
} from "./prompts";
import { withProviderRetry } from "./provider-retry";
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
    const startedAt = Date.now();
    const live = input.mode === "live";
    debugLog("web-researcher", "research start", {
      mode: input.mode,
      topic: input.topic,
      requiredDetailCount: input.requiredDetails?.length ?? 0,
    });

    const searched = await searchWeb(input.topic, 8, {
      fallback: live ? "throw" : "seeded",
    });
    const fetched = await fetchUrlContent(
      searched.slice(0, 5).map((result) => result.url),
      { fallback: live ? "throw" : "seeded" },
    );
    const sources = mergeSources(searched, fetched);
    const searchedQueries = [input.topic];

    if (input.mode === "demo" || !process.env.OPENAI_API_KEY || sources.length === 0) {
      if (live && !process.env.OPENAI_API_KEY) {
        throw new Error("OPENAI_API_KEY is required for live research synthesis.");
      }
      if (live && sources.length === 0) {
        throw new Error("Live web research found no sources to synthesize.");
      }

      debugLog("web-researcher", "using seeded report fallback", {
        mode: input.mode,
        sourceCount: sources.length,
        hasOpenAIKey: Boolean(process.env.OPENAI_API_KEY),
      }, "warn");
      return {
        report: getSeededResearchReport(searchedQueries),
        sources,
      };
    }

    const model = process.env.OPENAI_MODEL || "gpt-5.4-mini";
    const report = await this.generateReport(input, sources, model);

    debugLog("web-researcher", "research done", {
      mode: input.mode,
      sourceCount: sources.length,
      reportSourceCount: report.sources.length,
      durationMs: durationMs(startedAt),
    });

    return {
      report,
      sources,
    };
  }

  private async generateReport(
    input: WebResearcherInput,
    sources: SourceReference[],
    model: string,
  ): Promise<VerifiedResearchReport> {
    return withProviderRetry(
      { provider: "OpenAI", operation: "verified research report" },
      async () => {
        debugLog("web-researcher", "OpenAI report request", {
          model,
          sourceCount: sources.length,
          reasoningEffort: researchReasoningEffort(),
        });
        const response = await fetch("https://api.openai.com/v1/responses", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            reasoning: {
              effort: researchReasoningEffort(),
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
          const body = await response.text();
          throw new Error(`OpenAI report failed: ${response.status} ${body.slice(0, 500)}`);
        }

        const data = (await response.json()) as OpenAIResponsesResponse;
        const content = extractResponseText(data);
        if (!content) {
          throw new Error("OpenAI report returned no output text.");
        }

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
            throw new Error("OpenAI report returned an invalid JSON shape.");
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
        } catch (error) {
          debugLog("web-researcher", "OpenAI report parse failed", {
            error: previewForLog(error instanceof Error ? error.message : error, 300),
            output: previewForLog(content, 500),
          }, "warn");
          throw error;
        }
      },
    );
  }
}

function researchReasoningEffort() {
  const effort = process.env.OPENAI_RESEARCH_REASONING_EFFORT || "low";
  return ["minimal", "low", "medium", "high"].includes(effort) ? effort : "low";
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
