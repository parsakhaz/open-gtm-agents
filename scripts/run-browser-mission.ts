import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import type { BrowserMissionRequest, BrowserRunEvent } from "../src/lib/browser-relay/types";

type ParsedArgs = {
  _: string[];
  mission?: string;
  startUrl?: string;
  maxTurns?: string;
  allowedDomains?: string;
  [key: string]: string | string[] | undefined;
};

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const missionText =
  args.mission ||
  args._.join(" ") ||
  "Do something harmless and fun in the browser to pleasantly surprise the user.";
const startUrl = args.startUrl ?? "https://neal.fun/";
const maxTurns = Number(args.maxTurns ?? "35");
const allowedDomains = String(args.allowedDomains ?? new URL(startUrl).hostname)
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);

const mission: BrowserMissionRequest = {
  mission: missionText,
  startUrl,
  constraints: [
    "Keep it harmless, public, and reversible.",
    "Do not post, comment, message, like, follow, subscribe, buy, download, upload, sign in, or change any settings.",
    "Do not enter personal information or interact with accounts.",
    "Prefer opening and exploring a playful public page, game, or interactive visualization.",
    "Use the existing browser relay and visible browser so the user can watch what happens.",
  ],
  successCriteria: [
    "A fun public page is open in the browser.",
    "At least one harmless interaction is performed so the user can see activity.",
    "No external state-changing action is performed.",
  ],
  stopConditions: [
    "login",
    "captcha",
    "credentials",
    "permissions",
    "ambiguity",
    "destructive_confirmation",
  ],
  allowedDomains,
  maxTurns: Number.isFinite(maxTurns) && maxTurns > 0 ? maxTurns : 35,
};

const events: BrowserRunEvent[] = [];
const emit = (event: BrowserRunEvent) => {
  events.push(event);
  console.log(JSON.stringify(event));
};

void main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  const event: BrowserRunEvent = {
    type: "browser_error",
    message,
    createdAt: new Date().toISOString(),
  };
  console.error(JSON.stringify(event));
  process.exitCode = 1;
});

async function main() {
  loadEnvFiles();
  const { browserAgentService } = await import("../src/server/browser/browser-agent-service");
  await browserAgentService.runMission(mission, emit);

  const done = events.find((event) => event.type === "browser_done");
  if (done?.type === "browser_done" && !done.result.success) {
    process.exitCode = 2;
  }
}

function loadEnvFiles() {
  for (const file of [".env", ".env.local"]) {
    const fullPath = path.join(root, file);
    if (!existsSync(fullPath)) continue;
    loadEnvFile(fullPath);
  }
}

function loadEnvFile(filePath: string) {
  const text = readFileSync(filePath, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const index = line.indexOf("=");
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();

    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

function parseArgs(values: string[]) {
  const parsed: ParsedArgs = { _: [] };

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!value.startsWith("--")) {
      parsed._.push(value);
      continue;
    }

    const [rawKey, inlineValue] = value.slice(2).split("=", 2);
    const key = rawKey.replace(/-([a-z])/g, (_, char: string) => char.toUpperCase());
    parsed[key] = inlineValue ?? values[index + 1] ?? "true";

    if (inlineValue === undefined && values[index + 1] && !values[index + 1].startsWith("--")) {
      index += 1;
    }
  }

  return parsed;
}
