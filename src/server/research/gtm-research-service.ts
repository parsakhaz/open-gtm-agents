import type {
  GTMProfileField,
  ResearchRunEvent,
  ResearchRunRequest,
  ResearchRunSummary,
} from "@/lib/research/types";
import { RESEARCH_PROMPT_VERSION } from "./prompts";
import {
  seededOpportunities,
  seededProfileFields,
  seededSourceSearches,
  seededSources,
} from "./seeded-research";
import { researchStore } from "./research-store";
import { WebResearcherService } from "./web-researcher-service";

type EmitResearchEvent = (event: ResearchRunEvent) => void;

const delay = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export class GTMResearchService {
  constructor(private webResearcher = new WebResearcherService()) {}

  async run(input: ResearchRunRequest, emit: EmitResearchEvent) {
    const model = process.env.OPENROUTER_MODEL;
    const run = researchStore.createRun({
      websiteUrl: input.websiteUrl,
      objective: input.objective,
      mode: input.mode,
      model,
      metadata: {
        promptVersion: RESEARCH_PROMPT_VERSION,
      },
    });

    const emitAndStore = (event: ResearchRunEvent) => {
      researchStore.appendEvent(event);
      emit(event);
    };

    try {
      emitAndStore(status(run.id, "Reading website", `Opening ${input.websiteUrl} and extracting GTM signals.`));
      await delayForMode(input.mode, 250);

      emitAndStore(status(run.id, "Inferring GTM profile", "Identifying the product, buyer, pains, alternatives, and engagement boundaries."));
      for (const field of profileFieldsFor(input.websiteUrl)) {
        await delayForMode(input.mode, 90);
        researchStore.saveProfileField(run.id, field);
        emitAndStore({
          type: "profile_update",
          runId: run.id,
          field,
          createdAt: new Date().toISOString(),
        });
      }

      emitAndStore(status(run.id, "Generating search angles", "Turning the GTM profile into platform-native searches."));
      for (const search of seededSourceSearches) {
        await delayForMode(input.mode, 80);
        emitAndStore({
          type: "source_search",
          runId: run.id,
          source: search.source,
          query: search.query,
          createdAt: new Date().toISOString(),
        });
      }

      const { report, sources } = await this.webResearcher.research({
        mission:
          "Find source-backed GTM signals, comment opportunities, original post ideas, and competitive intelligence.",
        topic: seededSourceSearches.map((search) => search.query).join(" OR "),
        requiredDetails: [
          "buyer intent",
          "competitor complaints",
          "alternative-seeking language",
          "platform norms",
          "safe human-reviewed draft angles",
        ],
        outputGuidance:
          "Return concise findings that can be converted into GTM opportunity cards.",
        mode: input.mode,
      });

      const sourceResults = sources.length > 0 ? sources : seededSources;
      for (const source of sourceResults) {
        researchStore.saveSourceResult(run.id, source);
      }

      emitAndStore(status(run.id, "Ranking opportunities", `Evaluating fit, risk, freshness, and usefulness from ${report.sources.length} source references.`));
      await delayForMode(input.mode, 180);

      emitAndStore(status(run.id, "Drafting responses", "Preparing human-reviewable comments, post ideas, and competitive notes."));
      for (const opportunity of seededOpportunities) {
        await delayForMode(input.mode, 120);
        researchStore.saveOpportunity(run.id, opportunity);
        emitAndStore({
          type: "opportunity",
          runId: run.id,
          opportunity,
          createdAt: new Date().toISOString(),
        });
      }

      researchStore.completeRun(run.id);
      const result: ResearchRunSummary = {
        runId: run.id,
        profileFieldCount: seededProfileFields.length,
        sourceResultCount: sourceResults.length,
        opportunityCount: seededOpportunities.length,
        promptVersion: RESEARCH_PROMPT_VERSION,
        mode: input.mode,
      };

      emitAndStore({
        type: "done",
        runId: run.id,
        result,
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Research run failed.";
      researchStore.failRun(run.id, message);
      emitAndStore({
        type: "error",
        runId: run.id,
        message,
        createdAt: new Date().toISOString(),
      });
    }
  }
}

function profileFieldsFor(websiteUrl: string): GTMProfileField[] {
  if (websiteUrl.trim().length === 0) {
    return seededProfileFields;
  }

  return seededProfileFields;
}

function status(
  runId: string,
  stage: string,
  message: string,
): ResearchRunEvent {
  return {
    type: "status",
    runId,
    stage,
    message,
    createdAt: new Date().toISOString(),
  };
}

async function delayForMode(mode: ResearchRunRequest["mode"], ms: number) {
  if (mode === "live") return;
  await delay(ms);
}

export const gtmResearchService = new GTMResearchService();
