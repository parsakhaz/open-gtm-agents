import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import process from "node:process";

const allCases = [
  {
    name: "api-docs",
    websiteUrl: "https://platform.openai.com/docs/overview",
    objective: "opportunity_discovery",
  },
  {
    name: "business-ai",
    websiteUrl: "https://openai.com/business/",
    objective: "competitive_intel",
  },
];

const researchReportJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    content: { type: "string" },
    sources: { type: "array", items: { type: "string" } },
    limitations: { type: "string" },
  },
  required: ["content", "sources", "limitations"],
};

loadEnvFile(".env.local");
loadEnvFile(".env");

const model =
  process.env.OPENAI_RESEARCH_MODEL ||
  process.env.OPENAI_FAST_MODEL ||
  process.env.OPENAI_MODEL ||
  "gpt-5.4-nano";
const cases = process.env.RESEARCH_TEST_ALL_CASES === "1" ? allCases : allCases.slice(0, 1);

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is required. Pull Vercel env or create .env.local first.");
}

await verifyOpenAIContract();

const externalBaseUrl = process.env.RESEARCH_TEST_BASE_URL;
const detectedBaseUrl = externalBaseUrl || await detectExistingResearchServer();
const port = detectedBaseUrl ? undefined : await getOpenPort(3135);
const baseUrl = detectedBaseUrl || `http://127.0.0.1:${port}`;
const server = detectedBaseUrl ? undefined : startNextDevServer(port);

try {
  if (detectedBaseUrl) {
    console.log(`[research-test] using existing server ${detectedBaseUrl}`);
  } else {
    await waitForServer(baseUrl);
  }

  for (const testCase of cases) {
    const result = await runResearchCase(baseUrl, testCase);
    console.log(
      `[research:${testCase.name}] chunks=${result.chunks} first_chunk_ms=${result.firstChunkMs} events=${JSON.stringify(result.eventCounts)} done=${result.done}`,
    );
  }
} finally {
  if (server) {
    server.kill("SIGTERM");
  }
}

async function verifyOpenAIContract() {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      reasoning: { effort: process.env.OPENAI_RESEARCH_REASONING_EFFORT || "low" },
      input: [
        {
          role: "system",
          content: "Return only valid JSON matching the supplied schema.",
        },
        {
          role: "user",
          content:
            "Summarize OpenAI's Responses API streaming support in one sentence and cite https://platform.openai.com/docs.",
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
    throw new Error(`OpenAI Responses probe failed: ${response.status} ${body.slice(0, 500)}`);
  }

  const data = await response.json();
  const text = extractResponseText(data);
  if (!text) {
    throw new Error("OpenAI Responses probe returned no output text.");
  }

  const parsed = JSON.parse(text);
  if (
    typeof parsed.content !== "string" ||
    !Array.isArray(parsed.sources) ||
    typeof parsed.limitations !== "string"
  ) {
    throw new Error("OpenAI Responses probe returned an unexpected JSON shape.");
  }

  console.log(`[openai] model=${data.model || model} output_chars=${text.length}`);
}

async function runResearchCase(baseUrl, testCase) {
  const startedAt = Date.now();
  const response = await fetch(`${baseUrl}/api/research/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      websiteUrl: testCase.websiteUrl,
      mode: "live",
      objective: testCase.objective,
    }),
  });

  if (!response.ok || !response.body) {
    throw new Error(`[${testCase.name}] route failed: ${response.status} ${await response.text()}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let chunks = 0;
  let firstChunkMs;
  let done = false;
  const eventCounts = {};

  while (true) {
    const { done: streamDone, value } = await reader.read();
    if (streamDone) break;

    chunks += 1;
    firstChunkMs ??= Date.now() - startedAt;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.trim()) continue;
      const event = JSON.parse(line);
      eventCounts[event.type] = (eventCounts[event.type] || 0) + 1;

      if (event.type === "error") {
        throw new Error(`[${testCase.name}] stream error: ${event.message}`);
      }

      if (event.type === "done") {
        done = true;
      }
    }
  }

  if (buffer.trim()) {
    const event = JSON.parse(buffer);
    eventCounts[event.type] = (eventCounts[event.type] || 0) + 1;
    done = done || event.type === "done";
  }

  if (!done) {
    throw new Error(`[${testCase.name}] stream ended before done event.`);
  }

  for (const type of ["status", "profile_update", "source_search", "opportunity"]) {
    if (!eventCounts[type]) {
      throw new Error(`[${testCase.name}] missing ${type} events.`);
    }
  }

  return { chunks, firstChunkMs, eventCounts, done };
}

function extractResponseText(response) {
  if (response.output_text) {
    return response.output_text;
  }

  for (const item of response.output || []) {
    for (const content of item.content || []) {
      if (content.type === "output_text" && content.text) {
        return content.text;
      }
    }
  }

  return undefined;
}

function startNextDevServer(port) {
  const child = spawn("npm", ["run", "dev", "--", "--hostname", "127.0.0.1", "--port", String(port)], {
    env: { ...process.env, PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.startupError = "";

  child.stdout.on("data", (chunk) => {
    const text = chunk.toString();
    child.startupError += text;
    if (/ready|error/i.test(text)) {
      process.stdout.write(text);
    }
  });
  child.stderr.on("data", (chunk) => {
    const text = chunk.toString();
    child.startupError += text;
    process.stderr.write(chunk);
  });

  return child;
}

async function waitForServer(baseUrl) {
  const deadline = Date.now() + 45000;
  let lastError;

  while (Date.now() < deadline) {
    if (server?.exitCode !== null) {
      throw new Error(
        `Next dev server exited before startup. If one is already running, rerun with RESEARCH_TEST_BASE_URL, for example RESEARCH_TEST_BASE_URL=http://localhost:3001 npm run test:web-researcher.\n${server.startupError.slice(-1000)}`,
      );
    }

    try {
      const response = await fetch(baseUrl, { signal: AbortSignal.timeout(1500) });
      if (response.status < 500) return;
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Timed out waiting for ${baseUrl}: ${lastError?.message || "unknown error"}`);
}

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

function getOpenPort(startPort) {
  return new Promise((resolve, reject) => {
    const tryPort = (port) => {
      const server = net.createServer();
      server.once("error", (error) => {
        if (error.code === "EADDRINUSE") {
          tryPort(port + 1);
          return;
        }
        reject(error);
      });
      server.once("listening", () => {
        server.close(() => resolve(port));
      });
      server.listen(port, "127.0.0.1");
    };

    tryPort(startPort);
  });
}

async function detectExistingResearchServer() {
  for (let port = 3000; port <= 3010; port += 1) {
    const baseUrl = `http://127.0.0.1:${port}`;
    try {
      const response = await fetch(`${baseUrl}/api/research/run`, {
        signal: AbortSignal.timeout(800),
      });
      if (response.status === 405) {
        return baseUrl;
      }
    } catch {
      // Port is not serving this app.
    }
  }

  return undefined;
}
