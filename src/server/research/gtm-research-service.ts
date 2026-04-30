import { debugLog, durationMs } from "@/lib/debug-log";
import type {
  GTMProfileField,
  ResearchRunEvent,
  ResearchRunRequest,
  ResearchRunSummary,
  SourceReference,
  SourceSearch,
} from "@/lib/research/types";
import {
  generateLiveGtmPlan,
  extractLiveOpportunities,
} from "./live-gtm-generator";
import { RESEARCH_PROMPT_VERSION } from "./prompts";
import { researchStore } from "./research-store";
import {
  seededOpportunities,
  seededProfileFields,
  seededSourceSearches,
  seededSources,
} from "./seeded-research";
import { WebResearcherService } from "./web-researcher-service";
import { fetchUrlContent, searchWeb } from "./web-search";

type EmitResearchEvent = (event: ResearchRunEvent) => void;

const delay = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export class GTMResearchService {
  constructor(private webResearcher = new WebResearcherService()) {}

  async run(input: ResearchRunRequest, emit: EmitResearchEvent) {
    const model = researchModel();
    const run = researchStore.createRun({
      websiteUrl: input.websiteUrl,
      objective: input.objective,
      mode: input.mode,
      model,
      metadata: {
        promptVersion: RESEARCH_PROMPT_VERSION,
      },
    });
    const startedAt = Date.now();

    const emitAndStore = (event: ResearchRunEvent) => {
      researchStore.appendEvent(event);
      emit(event);
    };

    debugLog("gtm-research", "run start", {
      runId: run.id,
      websiteUrl: input.websiteUrl,
      objective: input.objective,
      mode: input.mode,
      model,
    });

    try {
      if (input.mode === "live") {
        await this.runLive(input, run.id, model, emitAndStore);
      } else {
        await this.runDemoLike(input, run.id, emitAndStore);
      }

      researchStore.completeRun(run.id);
      debugLog("gtm-research", "run complete", {
        runId: run.id,
        mode: input.mode,
        durationMs: durationMs(startedAt),
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Research run failed.";
      debugLog("gtm-research", "run failed", {
        runId: run.id,
        mode: input.mode,
        durationMs: durationMs(startedAt),
        error: message,
      }, "error");
      researchStore.failRun(run.id, message);
      emitAndStore({
        type: "error",
        runId: run.id,
        message,
        createdAt: new Date().toISOString(),
      });
    }
  }

  private async runDemoLike(
    input: ResearchRunRequest,
    runId: string,
    emit: EmitResearchEvent,
  ) {
    emit(status(runId, "Reading website", `Opening ${input.websiteUrl} and extracting GTM signals.`));
    await delayForMode(input.mode, 250);

    emit(status(runId, "Inferring GTM profile", "Identifying the product, buyer, pains, alternatives, and engagement boundaries."));
    for (const field of profileFieldsFor(input.websiteUrl)) {
      await delayForMode(input.mode, 90);
      this.emitProfileField(runId, field, emit);
    }

    emit(status(runId, "Generating search angles", "Turning the GTM profile into platform-native searches."));
    for (const search of seededSourceSearches) {
      await delayForMode(input.mode, 80);
      emitSourceSearch(runId, search, emit);
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
    this.emitSources(runId, sourceResults, emit);

    emit(status(runId, "Ranking opportunities", `Evaluating fit, risk, freshness, and usefulness from ${report.sources.length} source references.`));
    await delayForMode(input.mode, 180);

    emit(status(runId, "Drafting responses", "Preparing human-reviewable comments, post ideas, and competitive notes."));
    for (const opportunity of seededOpportunities) {
      await delayForMode(input.mode, 120);
      researchStore.saveOpportunity(runId, opportunity);
      emit({
        type: "opportunity",
        runId,
        opportunity,
        createdAt: new Date().toISOString(),
      });
    }

    emitDone(runId, {
      profileFieldCount: seededProfileFields.length,
      sourceResultCount: sourceResults.length,
      opportunityCount: seededOpportunities.length,
      mode: input.mode,
    }, emit);
  }

  private async runLive(
    input: ResearchRunRequest,
    runId: string,
    model: string,
    emit: EmitResearchEvent,
  ) {
    emit(status(runId, "Reading website", `Fetching ${input.websiteUrl} with Exa contents.`));
    const websiteSources = await fetchUrlContent([input.websiteUrl], { fallback: "throw" });
    if (websiteSources.length === 0) {
      throw new Error("Could not fetch website content for live research.");
    }
    this.emitSources(runId, websiteSources, emit);

    emit(status(runId, "Inferring GTM profile", "Generating a live GTM profile and search plan from the website."));
    const plan = await generateLiveGtmPlan({
      websiteUrl: input.websiteUrl,
      websiteSources,
      model,
    });

    for (const field of plan.profileFields) {
      this.emitProfileField(runId, field, emit);
    }

    emit(status(runId, "Generating search angles", "Turning the live GTM profile into source-backed web searches."));
    for (const search of plan.searches) {
      emitSourceSearch(runId, search, emit);
    }

    emit(status(runId, "Researching conversations", "Searching and fetching source content for the live opportunity queue."));
    const sources = await this.fetchLiveSources(plan.searches, input.websiteUrl);
    this.emitSources(runId, sources, emit);

    emit(status(runId, "Ranking opportunities", `Extracting opportunities from ${sources.length} live source results.`));
    const opportunities = await extractLiveOpportunities({
      websiteUrl: input.websiteUrl,
      profileFields: plan.profileFields,
      searches: plan.searches,
      sources,
      model,
    });

    emit(status(runId, "Drafting responses", "Preparing source-backed drafts for human review."));
    for (const opportunity of opportunities) {
      researchStore.saveOpportunity(runId, opportunity);
      emit({
        type: "opportunity",
        runId,
        opportunity,
        createdAt: new Date().toISOString(),
      });
    }

    emitDone(runId, {
      profileFieldCount: plan.profileFields.length,
      sourceResultCount: sources.length + websiteSources.length,
      opportunityCount: opportunities.length,
      mode: "live",
    }, emit);
  }

  private emitProfileField(
    runId: string,
    field: GTMProfileField,
    emit: EmitResearchEvent,
  ) {
    researchStore.saveProfileField(runId, field);
    emit({
      type: "profile_update",
      runId,
      field,
      createdAt: new Date().toISOString(),
    });
  }

  private async fetchLiveSources(searches: SourceSearch[], websiteUrl?: string) {
    const excludedDomain = websiteUrl ? hostnameForSearch(websiteUrl) : undefined;
    const query = searches
      .slice(0, liveSearchQueryCount())
      .map((search) => search.query)
      .join("\n");
    const externalQuery = excludedDomain
      ? `${query}
Prioritize real posts and discussions from Reddit, Hacker News, X/Twitter, LinkedIn, GitHub discussions/issues, forums, Q&A sites, and review/community threads.
Ignore vendor blogs, SEO articles, marketing pages, homepages, pricing pages, and product pages unless they are clearly competitor comparison evidence.
Exclude results from ${excludedDomain}.`
      : `${query}
Prioritize real posts and discussions from Reddit, Hacker News, X/Twitter, LinkedIn, GitHub discussions/issues, forums, Q&A sites, and review/community threads.
Ignore vendor blogs, SEO articles, marketing pages, homepages, pricing pages, and product pages unless they are clearly competitor comparison evidence.`;
    const searched = await searchWeb(externalQuery, liveSearchResultCount(), {
      fallback: "throw",
    });
    const fetched = await fetchUrlContent(
      searched.slice(0, liveFetchResultCount()).map((source) => source.url),
      { fallback: "throw" },
    );
    return mergeSources(searched, fetched).filter((source) => {
      if (!excludedDomain) return true;
      return hostnameForSearch(source.url) !== excludedDomain;
    });
  }

  private emitSources(
    runId: string,
    sources: SourceReference[],
    emit: EmitResearchEvent,
  ) {
    const seen = new Set<string>();
    for (const source of sources) {
      if (seen.has(source.url)) continue;
      seen.add(source.url);
      researchStore.saveSourceResult(runId, source);
      emit({
        type: "source_result",
        runId,
        source,
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

function emitSourceSearch(
  runId: string,
  search: SourceSearch,
  emit: EmitResearchEvent,
) {
  emit({
    type: "source_search",
    runId,
    source: search.source,
    query: search.query,
    createdAt: new Date().toISOString(),
  });
}

function emitDone(
  runId: string,
  summary: Omit<ResearchRunSummary, "runId" | "promptVersion">,
  emit: EmitResearchEvent,
) {
  emit({
    type: "done",
    runId,
    result: {
      runId,
      promptVersion: RESEARCH_PROMPT_VERSION,
      ...summary,
    },
    createdAt: new Date().toISOString(),
  });
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

function researchModel() {
  return (
    process.env.OPENAI_RESEARCH_MODEL ||
    process.env.OPENAI_MODEL ||
    process.env.OPENAI_FAST_MODEL ||
    "gpt-5.4-mini"
  );
}

function liveSearchQueryCount() {
  return numberEnv("RESEARCH_LIVE_QUERY_COUNT", 3);
}

function liveSearchResultCount() {
  return numberEnv("RESEARCH_LIVE_SEARCH_RESULTS", 4);
}

function liveFetchResultCount() {
  return numberEnv("RESEARCH_LIVE_FETCH_RESULTS", 3);
}

function numberEnv(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function hostnameForSearch(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^www\./, "");
  }
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

export const gtmResearchService = new GTMResearchService();
