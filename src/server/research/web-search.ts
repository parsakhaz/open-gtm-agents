import type { SourceReference } from "@/lib/research/types";
import { seededSources } from "./seeded-research";

type ExaSearchResult = {
  title?: string;
  url: string;
  highlights?: string[];
};

type ExaContentsResult = {
  title?: string;
  url: string;
  text?: string;
};

export async function searchWeb(
  query: string,
  maxResults = 8,
): Promise<SourceReference[]> {
  if (!process.env.EXA_API_KEY) {
    return seededSources.slice(0, maxResults).map((source) => ({
      ...source,
      snippet: `${source.snippet} Matched seeded query: ${query}`,
    }));
  }

  const response = await fetch("https://api.exa.ai/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.EXA_API_KEY,
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
    return seededSources.slice(0, maxResults);
  }

  const data = (await response.json()) as { results?: ExaSearchResult[] };

  return (data.results ?? []).map((result) => ({
    id: crypto.randomUUID(),
    source: "web",
    title: result.title || "Untitled",
    url: result.url,
    snippet: result.highlights?.join(" ") || "",
  }));
}

export async function fetchUrlContent(urls: string[]): Promise<SourceReference[]> {
  if (!process.env.EXA_API_KEY) {
    const urlSet = new Set(urls);
    return seededSources.filter((source) => urlSet.has(source.url));
  }

  const response = await fetch("https://api.exa.ai/contents", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.EXA_API_KEY,
    },
    body: JSON.stringify({
      urls,
      text: {
        maxCharacters: 10000,
      },
    }),
  });

  if (!response.ok) {
    return [];
  }

  const data = (await response.json()) as { results?: ExaContentsResult[] };

  return (data.results ?? []).map((result) => ({
    id: crypto.randomUUID(),
    source: "web",
    title: result.title || "Untitled",
    url: result.url,
    snippet: result.text?.slice(0, 500) || "",
    fetchedContent: result.text,
  }));
}
