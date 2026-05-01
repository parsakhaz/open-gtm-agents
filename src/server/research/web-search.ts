import { debugLog, durationMs, previewForLog } from "@/lib/debug-log";
import type { SourceReference } from "@/lib/research/types";
import { withProviderRetry } from "./provider-retry";
import { seededSources } from "./seeded-research";

type ExaSearchResult = {
  title?: string;
  url: string;
  highlights?: string[];
  score?: number;
  publishedDate?: string;
};

type ExaContentsResult = {
  title?: string;
  url: string;
  text?: string;
  publishedDate?: string;
};

type WebSearchOptions = {
  fallback?: "seeded" | "throw";
};

export async function searchWeb(
  query: string,
  maxResults = 8,
  options: WebSearchOptions = {},
): Promise<SourceReference[]> {
  const fallback = options.fallback ?? "seeded";
  if (!process.env.EXA_API_KEY) {
    if (fallback === "throw") {
      throw new Error("EXA_API_KEY is required for live web search.");
    }
    debugLog("exa", "missing EXA_API_KEY; using seeded search fallback", {
      query,
      maxResults,
    }, "warn");
    return seededSources.slice(0, maxResults).map((source) => ({
      ...source,
      snippet: `${source.snippet} Matched seeded query: ${query}`,
    }));
  }

  const startedAt = Date.now();
  try {
    return await withProviderRetry(
      { provider: "Exa", operation: "search" },
      async () => {
        debugLog("exa", "search request", { query, maxResults });
        const response = await fetch("https://api.exa.ai/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": process.env.EXA_API_KEY!,
          },
          body: JSON.stringify({
            query,
            numResults: maxResults,
            contents: {
              highlights: {
                numSentences: 3,
                highlightsPerUrl: 3,
              },
            },
          }),
        });

        if (!response.ok) {
          const body = await response.text();
          throw new Error(`Exa search failed: ${response.status} ${body.slice(0, 500)}`);
        }

        const data = (await response.json()) as { results?: ExaSearchResult[] };
        const results = (data.results ?? []).map((result) => ({
          id: crypto.randomUUID(),
          source: sourceIdForUrl(result.url),
          title: result.title || "Untitled",
          url: result.url,
          snippet: result.highlights?.join(" ") || "",
          publishedAt: result.publishedDate,
          qualityScore: normalizedExaScore(result.score),
          qualityReasons: result.score == null ? [] : [`Exa score ${result.score.toFixed(3)}`],
        }));

        debugLog("exa", "search response", {
          query,
          resultCount: results.length,
          durationMs: durationMs(startedAt),
        });
        return results;
      },
    );
  } catch (error) {
    if (fallback === "throw") throw error;
    debugLog("exa", "search failed; using seeded fallback", {
      query,
      error: previewForLog(error instanceof Error ? error.message : error, 300),
    }, "warn");
    return seededSources.slice(0, maxResults);
  }
}

export async function fetchUrlContent(
  urls: string[],
  options: WebSearchOptions = {},
): Promise<SourceReference[]> {
  const fallback = options.fallback ?? "seeded";
  if (!process.env.EXA_API_KEY) {
    if (fallback === "throw") {
      throw new Error("EXA_API_KEY is required for live URL content fetch.");
    }
    debugLog("exa", "missing EXA_API_KEY; using seeded content fallback", {
      urlCount: urls.length,
    }, "warn");
    const urlSet = new Set(urls);
    return seededSources.filter((source) => urlSet.has(source.url));
  }

  const startedAt = Date.now();
  try {
    return await withProviderRetry(
      { provider: "Exa", operation: "contents" },
      async () => {
        debugLog("exa", "contents request", { urlCount: urls.length, urls });
        const response = await fetch("https://api.exa.ai/contents", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": process.env.EXA_API_KEY!,
          },
          body: JSON.stringify({
            urls,
            text: {
              maxCharacters: 10000,
            },
          }),
        });

        if (!response.ok) {
          const body = await response.text();
          throw new Error(`Exa contents failed: ${response.status} ${body.slice(0, 500)}`);
        }

        const data = (await response.json()) as { results?: ExaContentsResult[] };
        const results = (data.results ?? []).map((result) => ({
          id: crypto.randomUUID(),
          source: sourceIdForUrl(result.url),
          title: result.title || "Untitled",
          url: result.url,
          snippet: result.text?.slice(0, 500) || "",
          fetchedContent: result.text,
          publishedAt: result.publishedDate,
        }));

        debugLog("exa", "contents response", {
          urlCount: urls.length,
          resultCount: results.length,
          durationMs: durationMs(startedAt),
        });
        return results;
      },
    );
  } catch (error) {
    if (fallback === "throw") throw error;
    debugLog("exa", "contents failed; using empty fallback", {
      urlCount: urls.length,
      error: previewForLog(error instanceof Error ? error.message : error, 300),
    }, "warn");
    return [];
  }
}

function sourceIdForUrl(url: string): SourceReference["source"] {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    if (hostname === "reddit.com" || hostname.endsWith(".reddit.com")) return "reddit";
    if (hostname === "news.ycombinator.com") return "hacker_news";
    if (hostname === "github.com" || hostname.endsWith(".github.com")) return "github";
    if (hostname === "x.com" || hostname === "twitter.com") return "x";
  } catch {
    return "web";
  }

  return "web";
}

function normalizedExaScore(score: number | undefined) {
  if (score == null || !Number.isFinite(score)) return undefined;
  return Math.max(0, Math.min(100, Math.round(score * 100)));
}
