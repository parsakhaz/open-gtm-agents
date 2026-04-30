import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

loadEnvFile(".env.local");
loadEnvFile(".env");

if (!process.env.EXA_API_KEY) {
  throw new Error("EXA_API_KEY is required. Pull Vercel env or create .env.local first.");
}

const query = process.env.EXA_TEST_QUERY || "AI receptionist local business missed calls";
const searchStarted = Date.now();
const searchResponse = await fetch("https://api.exa.ai/search", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": process.env.EXA_API_KEY,
  },
  body: JSON.stringify({
    query,
    numResults: 2,
    contents: {
      highlights: {
        numSentences: 2,
        highlightsPerUrl: 2,
      },
    },
  }),
});

if (!searchResponse.ok) {
  throw new Error(`Exa search failed: ${searchResponse.status} ${(await searchResponse.text()).slice(0, 500)}`);
}

const searchData = await searchResponse.json();
const results = searchData.results || [];
if (!results.length || !results[0].url) {
  throw new Error("Exa search returned no URL results.");
}

const contentsStarted = Date.now();
const contentsResponse = await fetch("https://api.exa.ai/contents", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": process.env.EXA_API_KEY,
  },
  body: JSON.stringify({
    urls: [results[0].url],
    text: {
      maxCharacters: 3000,
    },
  }),
});

if (!contentsResponse.ok) {
  throw new Error(`Exa contents failed: ${contentsResponse.status} ${(await contentsResponse.text()).slice(0, 500)}`);
}

const contentsData = await contentsResponse.json();
const content = contentsData.results?.[0]?.text || "";
if (!content) {
  throw new Error("Exa contents returned no fetched text.");
}

console.log(
  `[exa] query="${query}" results=${results.length} search_ms=${Date.now() - searchStarted} contents_ms=${Date.now() - contentsStarted} first_url=${results[0].url}`,
);

function loadEnvFile(filePath) {
  const absolutePath = path.resolve(process.cwd(), filePath);
  let contents;

  try {
    contents = readFileSync(absolutePath, "utf8");
  } catch {
    return;
  }

  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const index = trimmed.indexOf("=");
    if (index === -1) continue;

    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] ||= value;
  }
}
