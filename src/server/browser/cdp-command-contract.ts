import type { BrowserCommand } from "@/lib/browser-relay/types";

export const browserToolNames = [
  "list_tabs",
  "new_tab",
  "snap",
  "screenshot",
  "navigate",
  "click_element",
  "clickxy",
  "type_text",
  "press_key",
  "scroll",
  "wait_for_text",
  "wait_for_url",
] as const;

export function isBrowserCommandName(
  value: string,
): value is BrowserCommand["name"] {
  return browserToolNames.includes(value as BrowserCommand["name"]);
}

export function toBrowserCommand(
  name: BrowserCommand["name"],
  args: Record<string, unknown>,
): BrowserCommand {
  switch (name) {
    case "list_tabs":
      return { name };
    case "new_tab":
      return {
        name,
        url: typeof args.url === "string" ? args.url : undefined,
      };
    case "snap":
      return {
        name,
        tabId: requireString(args.tabId, "tabId"),
        mode: args.mode === "full" ? "full" : "interactive",
      };
    case "screenshot":
      return { name, tabId: requireString(args.tabId, "tabId") };
    case "navigate":
      return {
        name,
        tabId: requireString(args.tabId, "tabId"),
        url: requireString(args.url, "url"),
      };
    case "click_element":
      return {
        name,
        tabId: requireString(args.tabId, "tabId"),
        index: requireElementRef(args.index),
      };
    case "clickxy":
      return {
        name,
        tabId: requireString(args.tabId, "tabId"),
        x: requireNumber(args.x, "x"),
        y: requireNumber(args.y, "y"),
      };
    case "type_text":
      return {
        name,
        tabId: requireString(args.tabId, "tabId"),
        text: requireString(args.text, "text"),
      };
    case "press_key":
      return {
        name,
        tabId: requireString(args.tabId, "tabId"),
        key: requireString(args.key, "key"),
      };
    case "scroll":
      return {
        name,
        tabId: requireString(args.tabId, "tabId"),
        direction: args.direction === "up" ? "up" : "down",
        amount:
          typeof args.amount === "number" && Number.isFinite(args.amount)
            ? args.amount
            : undefined,
      };
    case "wait_for_text":
      return {
        name,
        tabId: requireString(args.tabId, "tabId"),
        text: requireString(args.text, "text"),
        timeoutMs:
          typeof args.timeoutMs === "number" && Number.isFinite(args.timeoutMs)
            ? args.timeoutMs
            : undefined,
      };
    case "wait_for_url":
      return {
        name,
        tabId: requireString(args.tabId, "tabId"),
        pattern: requireString(args.pattern, "pattern"),
        timeoutMs:
          typeof args.timeoutMs === "number" && Number.isFinite(args.timeoutMs)
            ? args.timeoutMs
            : undefined,
      };
  }
}

function requireString(value: unknown, key: string) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${key} is required.`);
  }

  return value;
}

function requireNumber(value: unknown, key: string) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${key} must be a number.`);
  }

  return value;
}

function requireElementRef(value: unknown): `@e${number}` {
  if (typeof value !== "string" || !/^@e\d+$/.test(value)) {
    throw new Error('index must be an element ref like "@e42".');
  }

  return value as `@e${number}`;
}
