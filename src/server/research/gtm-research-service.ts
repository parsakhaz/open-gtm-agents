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
    emit(status(runId, "Website content ready", `Fetched ${websiteSources.length} live page source for GTM analysis.`));

    emit(status(runId, "Inferring GTM profile", "Generating a live GTM profile and search plan from the website."));
    emit(status(runId, "GTM model running", "Building product context, target customer, pains, alternatives, and search angles."));
    const plan = await generateLiveGtmPlan({
      websiteUrl: input.websiteUrl,
      websiteSources,
      model,
    });
    emit(status(runId, "GTM profile ready", `Generated ${plan.profileFields.length} live profile fields and ${plan.searches.length} search missions.`));

    for (const field of plan.profileFields) {
      this.emitProfileField(runId, field, emit);
    }

    emit(status(runId, "Generating search angles", "Turning the live GTM profile into source-backed web searches."));
    for (const search of plan.searches) {
      emitSourceSearch(runId, search, emit);
    }

    emit(status(runId, "Researching conversations", "Searching and fetching source content for the live opportunity queue."));
    emit(status(runId, "Source search running", "Looking for real discussions, threads, issues, and community posts."));
    const sources = await this.fetchLiveSources(plan.searches, input.websiteUrl);
    this.emitSources(runId, sources, emit);
    emit(status(runId, "Source search complete", `Fetched ${sources.length} external source results for review.`));

    emit(status(runId, "Ranking opportunities", `Extracting opportunities from ${sources.length} live source results.`));
    emit(status(runId, "Opportunity model running", "Scoring fit, risk, source specificity, and draft usefulness."));
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
    const rankedSearchResults = rankLiveSources(searched, excludedDomain);
    const searchCandidates = rankedSearchResults.filter(
      (source) => (source.qualityScore ?? 0) >= liveSourceMinScore(),
    );
    const fetched = await fetchUrlContent(
      searchCandidates.slice(0, liveFetchResultCount()).map((source) => source.url),
      { fallback: "throw" },
    );
    const ranked = rankLiveSources(mergeSources(rankedSearchResults, fetched), excludedDomain)
      .filter((source) => (source.qualityScore ?? 0) >= liveSourceMinScore())
      .slice(0, liveSearchResultCount());

    debugLog("gtm-research", "live source quality filter", {
      searched: searched.length,
      candidates: searchCandidates.length,
      fetched: fetched.length,
      kept: ranked.length,
      minScore: liveSourceMinScore(),
      maxResults: liveSearchResultCount(),
      excludedDomain,
      keptSources: ranked.map((source) => ({
        source: source.source,
        score: source.qualityScore,
        url: source.url,
        reasons: source.qualityReasons?.slice(0, 3),
      })),
    });

    return ranked;
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
  return numberEnv("RESEARCH_LIVE_SEARCH_RESULTS", 8);
}

function liveFetchResultCount() {
  return numberEnv("RESEARCH_LIVE_FETCH_RESULTS", 6);
}

function liveSourceMinScore() {
  return numberEnv("RESEARCH_LIVE_SOURCE_MIN_SCORE", 70);
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
    const existing = byUrl.get(source.url);
    byUrl.set(source.url, {
      ...(existing ?? source),
      ...source,
      qualityScore: source.qualityScore ?? existing?.qualityScore,
      qualityReasons: source.qualityReasons ?? existing?.qualityReasons,
    });
  }
  return Array.from(byUrl.values());
}

function rankLiveSources(sources: SourceReference[], excludedDomain?: string) {
  return sources
    .map((source) => scoreLiveSource(source, excludedDomain))
    .filter((source) => !excludedDomain || hostnameForSearch(source.url) !== excludedDomain)
    .sort((a, b) => (b.qualityScore ?? 0) - (a.qualityScore ?? 0));
}

function scoreLiveSource(source: SourceReference, excludedDomain?: string): SourceReference {
  const text = `${source.title} ${source.snippet} ${source.fetchedContent ?? ""}`.toLowerCase();
  const hostname = hostnameForSearch(source.url);
  const path = pathForScore(source.url);
  const surface = `${hostname} ${path} ${source.title}`.toLowerCase();
  const reasons: string[] = [];
  let score = source.qualityScore ?? 45;

  if (source.qualityScore != null) {
    reasons.push(`Exa relevance ${source.qualityScore}`);
  }

  if (source.source === "reddit" || source.source === "hacker_news") {
    score += 24;
    reasons.push("community discussion");
  } else if (source.source === "github") {
    score += 16;
    reasons.push("developer discussion");
  } else if (source.source === "x") {
    score += 12;
    reasons.push("social post");
  }

  const hasConversationSurface =
    /(forum|community|discussion|comments|thread|question|answers?|issue|review|reddit|hacker news|salongeek|news\.ycombinator|github)/i.test(surface);

  if (hasConversationSurface) {
    score += 18;
    reasons.push("conversation surface");
  }

  if (/(i |we |my |our |anyone|recommend|struggling|problem|help|can't|cannot|missed|voicemail|receptionist|booking|calls?|clients?)/i.test(text)) {
    score += 14;
    reasons.push("operator pain language");
  }

  if (/(blog|pricing|features|product|homepage|landing|demo|signup|contact|services|solutions)/i.test(path)) {
    score -= 18;
    reasons.push("marketing page signal");
  }

  if (source.source === "web" && !hasConversationSurface) {
    score -= 22;
    reasons.push("not an obvious conversation source");
  }

  if (/(vendor|platform|software|ai receptionist|answering service)/i.test(`${hostname} ${text}`) && source.source === "web") {
    score -= 8;
    reasons.push("possible vendor content");
  }

  if (excludedDomain && hostname === excludedDomain) {
    score = 0;
    reasons.push("submitted domain excluded");
  }

  return {
    ...source,
    qualityScore: Math.max(0, Math.min(100, Math.round(score))),
    qualityReasons: [...new Set([...(source.qualityReasons ?? []), ...reasons])],
  };
}

function pathForScore(url: string) {
  try {
    return new URL(url).pathname.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

export const gtmResearchService = new GTMResearchService();
