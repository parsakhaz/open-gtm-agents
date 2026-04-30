import type {
  BrowserCommand,
  BrowserMissionRequest,
  BrowserResult,
  BrowserRunEvent,
  CommandResult,
  PostCommentRequest,
} from "@/lib/browser-relay/types";
import { debugLog, durationMs, previewForLog } from "@/lib/debug-log";
import {
  buildMissionUserMessage,
  buildPostCommentMission,
  defaultStructuredHandoff,
} from "./browser-mission";
import {
  browserToolNames,
  isBrowserCommandName,
  toBrowserCommand,
} from "./cdp-command-contract";
import {
  type BrowserRelayTransport,
  localBrowserRelay,
} from "./local-browser-relay";
import { BROWSER_MISSION_SYSTEM_PROMPT } from "./prompts";

type EmitBrowserEvent = (event: BrowserRunEvent) => void;

type ResponseOutputItem = {
  type?: string;
  id?: string;
  call_id?: string;
  name?: string;
  arguments?: string;
  content?: Array<{ type?: string; text?: string }>;
};

type OpenAIResponsesResponse = {
  id?: string;
  output_text?: string;
  output?: ResponseOutputItem[];
};

const DEFAULT_MAX_TURNS = 35;
const SAME_ERROR_LIMIT = 3;
const NO_PROGRESS_LIMIT = 6;

export class BrowserAgentService {
  constructor(private relay: BrowserRelayTransport = localBrowserRelay) {}

  async postComment(input: PostCommentRequest, emit: EmitBrowserEvent) {
    return this.runMission(buildPostCommentMission(input), emit);
  }

  async runMission(mission: BrowserMissionRequest, emit: EmitBrowserEvent) {
    const runId = crypto.randomUUID();
    const startedAt = Date.now();
    debugLog("browser-agent", "mission start", {
      runId,
      mission: mission.mission,
      startUrl: mission.startUrl,
      exactTextLength: mission.exactTextToSubmit?.length ?? 0,
      opportunityId: mission.opportunityId,
      model: process.env.OPENAI_MODEL || "gpt-5.4-mini",
      reasoningEffort: "high",
    });

    const status = await this.safeStatus();
    debugLog("browser-agent", "relay status", { runId, status });
    emit({
      type: "browser_status",
      connected: status.connected,
      message: status.connected
        ? `Connected to ${status.browserInfo?.browser ?? "browser"}.`
        : "Browser companion is not connected to Chrome/Edge CDP.",
      createdAt: new Date().toISOString(),
    });

    if (!status.connected) {
      debugLog("browser-agent", "blocked: relay disconnected", { runId }, "warn");
      emit({
        type: "browser_error",
        message:
          "Browser companion is not connected. Start Chrome with --remote-debugging-port=9222 and run npm run desktop:dev.",
        createdAt: new Date().toISOString(),
      });
      return;
    }

    if (!process.env.OPENAI_API_KEY) {
      debugLog("browser-agent", "blocked: missing OPENAI_API_KEY", { runId }, "warn");
      emit({
        type: "browser_error",
        message: "OPENAI_API_KEY is required for Post now.",
        createdAt: new Date().toISOString(),
      });
      return;
    }

    const result = await this.runOpenAIToolLoop(mission, emit, runId);
    debugLog("browser-agent", "mission done", {
      runId,
      durationMs: durationMs(startedAt),
      success: result.success,
      summary: result.summary,
      actionsTaken: result.actionsTaken,
      error: result.error,
      needsUserInput: result.needsUserInput,
    }, result.success ? "info" : "warn");
    emit({
      type: "browser_done",
      result,
      createdAt: new Date().toISOString(),
    });
  }

  private async safeStatus() {
    try {
      return await this.relay.getStatus();
    } catch (error) {
      debugLog("browser-agent", "relay status failed", {
        error: error instanceof Error ? error.message : String(error),
      }, "warn");
      return { enabled: false, connected: false };
    }
  }

  private async runOpenAIToolLoop(
    mission: BrowserMissionRequest,
    emit: EmitBrowserEvent,
    runId: string,
  ): Promise<BrowserResult> {
    const model = process.env.OPENAI_MODEL || "gpt-5.4-mini";
    let previousResponseId: string | undefined;
    let nextInput: unknown = [
      {
        role: "system",
        content: BROWSER_MISSION_SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: buildMissionUserMessage(mission),
      },
    ];
    const actionsTaken: string[] = [];
    let repeatedErrors = 0;
    let lastError: string | undefined;
    let sameErrorCount = 0;
    let lastUrl: string | undefined;
    let mutationsSinceUrlChange = 0;
    const maxTurns = mission.maxTurns ?? DEFAULT_MAX_TURNS;

    debugLog("browser-agent", "tool loop start", {
      runId,
      model,
      maxTurns,
      targetUrl: mission.startUrl,
      exactTextLength: mission.exactTextToSubmit?.length ?? 0,
    });

    for (let turn = 0; turn < maxTurns; turn++) {
      emit({
        type: "browser_agent_step",
        message: `Browser agent turn ${turn + 1}/${maxTurns}`,
        createdAt: new Date().toISOString(),
      });
      debugLog("browser-agent", "model turn start", {
        runId,
        turn: turn + 1,
        previousResponseId,
        input: previewForLog(nextInput, 1_500),
      });
      const response = await this.createResponse(
        model,
        nextInput,
        previousResponseId,
        emit,
      );
      previousResponseId = response.id;

      const calls = (response.output ?? []).filter(
        (item) => item.type === "function_call",
      );
      debugLog("browser-agent", "model turn output", {
        runId,
        turn: turn + 1,
        responseId: response.id,
        outputText: previewForLog(extractResponseText(response)),
        toolCalls: calls.map((call) => ({
          name: call.name,
          arguments: previewForLog(call.arguments),
        })),
      });

      if (calls.length === 0) {
        const text = extractResponseText(response);
        return {
          summary: text || "Browser agent stopped without producing a result.",
          actionsTaken,
          success: false,
          error: "No tool call returned.",
          structuredHandoff: defaultStructuredHandoff(
            text || "Browser agent stopped without producing a result.",
            actionsTaken,
          ),
          needsUserInput: {
            blockedOn: "clarification",
            question:
              text ||
              "The browser agent stopped before posting. Please inspect the page manually.",
          },
        };
      }

      const functionOutputs: unknown[] = [];

      for (const call of calls) {
        const name = call.name ?? "";
        debugLog("browser-agent", "tool call selected", {
          turn: turn + 1,
          name,
          arguments: previewForLog(call.arguments),
        });
        emit({
          type: "browser_tool_call",
          command: isBrowserCommandName(name) ? name : "produce_browser_result",
          createdAt: new Date().toISOString(),
        });

        if (name === "produce_browser_result") {
          const parsed = parseCallArguments(call.arguments);
          debugLog("browser-agent", "produce_browser_result", {
            turn: turn + 1,
            result: previewForLog(parsed, 1_500),
          });
          return normalizeBrowserResult(parsed, actionsTaken);
        }

        if (!isBrowserCommandName(name)) {
          debugLog("browser-agent", "unsupported tool", { name }, "warn");
          functionOutputs.push({
            type: "function_call_output",
            call_id: call.call_id,
            output: `Unsupported tool: ${name}`,
          });
          continue;
        }

        let command: BrowserCommand;
        try {
          command = toBrowserCommand(name, parseCallArguments(call.arguments));
        } catch (error) {
          const message = error instanceof Error ? error.message : "Invalid command.";
          debugLog("browser-agent", "tool args rejected", {
            name,
            error: message,
            arguments: previewForLog(call.arguments),
          }, "warn");
          functionOutputs.push({
            type: "function_call_output",
            call_id: call.call_id,
            output: `Error: ${message}`,
          });
          continue;
        }

        const commandResult = await this.relay.execute(command);
        actionsTaken.push(formatAction(command, commandResult.ok));
        repeatedErrors = commandResult.ok ? 0 : repeatedErrors + 1;
        const currentError = commandResult.ok ? undefined : commandResult.error || "Unknown command error.";
        if (currentError && currentError === lastError) {
          sameErrorCount += 1;
        } else {
          sameErrorCount = currentError ? 1 : 0;
          lastError = currentError;
        }
        const observedUrl = extractUrl(commandResult.result);
        if (observedUrl) {
          if (!lastUrl || observedUrl !== lastUrl) {
            lastUrl = observedUrl;
            mutationsSinceUrlChange = 0;
          }
        } else if (isMutationCommand(command)) {
          mutationsSinceUrlChange += 1;
        }
        debugLog("browser-agent", "tool command result", {
          runId,
          name,
          ok: commandResult.ok,
          repeatedErrors,
          sameErrorCount,
          mutationsSinceUrlChange,
          result: previewForLog(commandResult.result ?? commandResult.error),
        }, commandResult.ok ? "info" : "warn");

        emit({
          type: "browser_tool_result",
          command: name,
          ok: commandResult.ok,
          preview: preview(commandResult.result || commandResult.error || ""),
          createdAt: new Date().toISOString(),
        });

        functionOutputs.push({
          type: "function_call_output",
          call_id: call.call_id,
          output: JSON.stringify(toModelCommandResult(command, commandResult)),
        });

        const handoffReason = getLoopHandoffReason(
          repeatedErrors,
          sameErrorCount,
          mutationsSinceUrlChange,
        );
        if (handoffReason) {
          debugLog("browser-agent", "stopping after repeated command failures", {
            runId,
            repeatedErrors,
            sameErrorCount,
            mutationsSinceUrlChange,
            lastError: commandResult.error,
            actionsTaken,
          }, "warn");
          const handoff = defaultStructuredHandoff(handoffReason, actionsTaken);
          emit({
            type: "browser_handoff",
            handoff,
            createdAt: new Date().toISOString(),
          });
          return {
            summary: handoffReason,
            actionsTaken,
            success: false,
            error: commandResult.error || "Repeated browser command failures.",
            structuredHandoff: handoff,
            needsUserInput: {
              blockedOn: "clarification",
              question:
                "The page did not respond to repeated posting attempts. Please inspect the target page and try again.",
            },
          };
        }
      }

      nextInput = functionOutputs;
    }

    debugLog("browser-agent", "turn limit reached", { actionsTaken }, "warn");
    const handoff = defaultStructuredHandoff("Browser mission reached the turn limit before finishing.", actionsTaken);
    emit({
      type: "browser_handoff",
      handoff,
      createdAt: new Date().toISOString(),
    });
    return {
      summary: "Browser mission reached the turn limit before finishing.",
      actionsTaken,
      success: false,
      error: "Turn limit reached.",
      structuredHandoff: handoff,
      needsUserInput: {
        blockedOn: "clarification",
        question:
          "The browser agent could not finish within its turn budget. Please inspect the page and try again.",
      },
    };
  }

  private async createResponse(
    model: string,
    input: unknown,
    previousResponseId?: string,
    emit?: EmitBrowserEvent,
  ): Promise<OpenAIResponsesResponse> {
    const body = JSON.stringify({
      model,
      previous_response_id: previousResponseId,
      input,
      tools: browserTools(),
      tool_choice: "auto",
      reasoning: {
        effort: "high",
      },
      truncation: "auto",
    });

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const startedAt = Date.now();
      debugLog("browser-agent", "OpenAI response request", {
        model,
        attempt: attempt + 1,
        previousResponseId,
        bodyLength: body.length,
      });
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body,
      });

      if (response.ok) {
        const json = (await response.json()) as OpenAIResponsesResponse;
        debugLog("browser-agent", "OpenAI response ok", {
          model,
          attempt: attempt + 1,
          status: response.status,
          durationMs: durationMs(startedAt),
          responseId: json.id,
          outputItems: json.output?.length ?? 0,
        });
        return json;
      }

      const detail = await response.text();
      if (
        (response.status === 429 || response.status >= 500) &&
        attempt < 2 &&
        !isHardRateLimit(detail)
      ) {
        const retryDelayMs = getRetryDelayMs(response, detail, attempt);
        debugLog("browser-agent", "OpenAI response retry", {
          model,
          attempt: attempt + 1,
          status: response.status,
          durationMs: durationMs(startedAt),
          retryDelayMs,
          detail: previewForLog(detail),
        }, "warn");
        emit?.({
          type: "browser_agent_retry",
          message: `OpenAI browser agent retrying after ${response.status}.`,
          retryDelayMs,
          createdAt: new Date().toISOString(),
        });
        await sleep(retryDelayMs);
        continue;
      }

      debugLog("browser-agent", "OpenAI response failed", {
        model,
        attempt: attempt + 1,
        status: response.status,
        durationMs: durationMs(startedAt),
        detail: previewForLog(detail),
      }, "error");
      throw new Error(
        `OpenAI browser agent failed with ${response.status}: ${preview(detail)}`,
      );
    }

    throw new Error("OpenAI browser agent failed after retries.");
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRetryDelayMs(response: Response, detail: string, attempt: number) {
  const retryAfter = Number(response.headers.get("retry-after"));
  if (Number.isFinite(retryAfter) && retryAfter > 0) {
    return Math.min(retryAfter * 1000, 30_000);
  }

  const bodySecondsDelay = detail.match(/try again in\s+([\d.]+)s/i);
  if (bodySecondsDelay?.[1]) {
    return Math.min(Number(bodySecondsDelay[1]) * 1000, 30_000);
  }

  const bodyMinuteDelay = detail.match(/try again in\s+(?:(\d+)m)?\s*(?:(\d+)s)?/i);
  if (bodyMinuteDelay?.[1] || bodyMinuteDelay?.[2]) {
    const minutes = Number(bodyMinuteDelay[1] ?? 0);
    const seconds = Number(bodyMinuteDelay[2] ?? 0);
    return Math.min((minutes * 60 + seconds) * 1000, 30_000);
  }

  return 2_500 * (attempt + 1);
}

function isHardRateLimit(detail: string) {
  return /requests per day|rpd|billing/i.test(detail);
}

function parseCallArguments(value: string | undefined): Record<string, unknown> {
  if (!value) return {};
  const parsed = JSON.parse(value) as unknown;
  return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
    ? (parsed as Record<string, unknown>)
    : {};
}

function normalizeBrowserResult(
  value: Record<string, unknown>,
  fallbackActions: string[],
): BrowserResult {
  const actionsTaken = Array.isArray(value.actionsTaken)
    ? value.actionsTaken.filter((item): item is string => typeof item === "string")
    : fallbackActions;

  const needsUserInput =
    typeof value.needsUserInput === "object" && value.needsUserInput !== null
      ? (value.needsUserInput as BrowserResult["needsUserInput"])
      : undefined;
  const structuredHandoff =
    typeof value.structuredHandoff === "object" &&
    value.structuredHandoff !== null
      ? (value.structuredHandoff as BrowserResult["structuredHandoff"])
      : undefined;

  return {
    summary:
      typeof value.summary === "string"
        ? value.summary
        : "Browser posting finished.",
    actionsTaken,
    finalUrl: typeof value.finalUrl === "string" ? value.finalUrl : undefined,
    activeTabId:
      typeof value.activeTabId === "string" ? value.activeTabId : undefined,
    success: value.success === true,
    error: typeof value.error === "string" ? value.error : undefined,
    structuredHandoff,
    needsUserInput,
  };
}

function extractResponseText(response: OpenAIResponsesResponse) {
  if (response.output_text) return response.output_text;

  for (const item of response.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && content.text) {
        return content.text;
      }
    }
  }

  return undefined;
}

function browserTools() {
  return [
    ...browserToolNames.map((name) => ({
      type: "function",
      name,
      description: toolDescription(name),
      parameters: toolSchema(name),
      strict: false,
    })),
    {
      type: "function",
      name: "produce_browser_result",
      description: "Submit the final result of the browser mission.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          summary: { type: "string" },
          actionsTaken: { type: "array", items: { type: "string" } },
          finalUrl: { type: "string" },
          activeTabId: { type: "string" },
          success: { type: "boolean" },
          error: { type: "string" },
          needsUserInput: {
            type: "object",
            additionalProperties: false,
            properties: {
              question: { type: "string" },
              blockedOn: {
                type: "string",
                enum: [
                  "missing_information",
                  "destructive_confirmation",
                  "clarification",
                  "credentials",
                ],
              },
            },
            required: ["question", "blockedOn"],
          },
          structuredHandoff: {
            type: "object",
            additionalProperties: false,
            properties: {
              currentState: {
                type: "object",
                additionalProperties: false,
                properties: {
                  description: { type: "string" },
                  url: { type: "string" },
                  tabId: { type: "string" },
                },
                required: ["description"],
              },
              stepsCompleted: { type: "array", items: { type: "string" } },
              approachesTried: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    approach: { type: "string" },
                    result: {
                      type: "string",
                      enum: ["success", "partial", "failed"],
                    },
                    detail: { type: "string" },
                  },
                  required: ["approach", "result", "detail"],
                },
              },
              nextSteps: { type: "array", items: { type: "string" } },
            },
            required: [
              "currentState",
              "stepsCompleted",
              "approachesTried",
              "nextSteps",
            ],
          },
        },
        required: ["summary", "actionsTaken", "success"],
      },
      strict: false,
    },
  ];
}

function toolDescription(name: BrowserCommand["name"]) {
  const descriptions: Record<BrowserCommand["name"], string> = {
    list_tabs: "List open browser tabs.",
    new_tab: "Open a new browser tab, optionally at a URL. Returns the tab ID.",
    snap: "Return an accessibility snapshot with @eN refs for interactive elements.",
    screenshot: "Capture the viewport as a JPEG with DPR metadata.",
    navigate: "Navigate an existing tab to a URL.",
    click_element: "Click an element by its @eN ref from snap.",
    clickxy: "Click at CSS pixel coordinates.",
    type_text: "Type text into the currently focused input.",
    press_key: "Press a keyboard key or combo such as Enter or Control+a.",
    scroll: "Scroll the page.",
    wait_for_text: "Wait until text appears on the page.",
    wait_for_url: "Wait until the current URL matches a glob pattern.",
  };
  return descriptions[name];
}

function toolSchema(name: BrowserCommand["name"]) {
  const tabId = { type: "string", description: "Tab ID from list_tabs or new_tab." };
  const schemas: Record<BrowserCommand["name"], Record<string, unknown>> = {
    list_tabs: { type: "object", properties: {}, additionalProperties: false },
    new_tab: {
      type: "object",
      properties: { url: { type: "string" } },
      additionalProperties: false,
    },
    snap: {
      type: "object",
      properties: {
        tabId,
        mode: { type: "string", enum: ["interactive", "full"] },
      },
      required: ["tabId"],
      additionalProperties: false,
    },
    screenshot: {
      type: "object",
      properties: { tabId },
      required: ["tabId"],
      additionalProperties: false,
    },
    navigate: {
      type: "object",
      properties: { tabId, url: { type: "string" } },
      required: ["tabId", "url"],
      additionalProperties: false,
    },
    click_element: {
      type: "object",
      properties: {
        tabId,
        index: { type: "string", description: 'Element ref like "@e42".' },
      },
      required: ["tabId", "index"],
      additionalProperties: false,
    },
    clickxy: {
      type: "object",
      properties: { tabId, x: { type: "number" }, y: { type: "number" } },
      required: ["tabId", "x", "y"],
      additionalProperties: false,
    },
    type_text: {
      type: "object",
      properties: { tabId, text: { type: "string" } },
      required: ["tabId", "text"],
      additionalProperties: false,
    },
    press_key: {
      type: "object",
      properties: { tabId, key: { type: "string" } },
      required: ["tabId", "key"],
      additionalProperties: false,
    },
    scroll: {
      type: "object",
      properties: {
        tabId,
        direction: { type: "string", enum: ["up", "down"] },
        amount: { type: "number" },
      },
      required: ["tabId"],
      additionalProperties: false,
    },
    wait_for_text: {
      type: "object",
      properties: {
        tabId,
        text: { type: "string" },
        timeoutMs: { type: "number" },
      },
      required: ["tabId", "text"],
      additionalProperties: false,
    },
    wait_for_url: {
      type: "object",
      properties: {
        tabId,
        pattern: { type: "string" },
        timeoutMs: { type: "number" },
      },
      required: ["tabId", "pattern"],
      additionalProperties: false,
    },
  };

  return schemas[name];
}

function preview(value: string) {
  return value.length > 240 ? `${value.slice(0, 240)}...` : value;
}

function toModelCommandResult(command: BrowserCommand, result: CommandResult): CommandResult {
  if (!result.result) return result;

  if (command.name === "screenshot") {
    const metaMatch = result.result.match(/^__SCREENSHOT_META__(.*?)__/);
    return {
      ...result,
      result: metaMatch
        ? `Screenshot captured. Metadata: ${metaMatch[1]}. Image bytes omitted from model context. Use snap for element refs.`
        : "Screenshot captured. Image bytes omitted from model context. Use snap for element refs.",
    };
  }

  if (result.result.length > 12_000) {
    return {
      ...result,
      result: `${result.result.slice(0, 12_000)}\n...[truncated ${result.result.length - 12_000} chars]`,
    };
  }

  return result;
}

const MUTATION_COMMANDS = new Set<BrowserCommand["name"]>([
  "new_tab",
  "navigate",
  "click_element",
  "clickxy",
  "type_text",
  "press_key",
  "scroll",
]);

function isMutationCommand(command: BrowserCommand) {
  return MUTATION_COMMANDS.has(command.name);
}

function extractUrl(value?: string) {
  if (!value) return undefined;
  const explicitUrl = value.match(/^URL:\s*(\S+)/m);
  if (explicitUrl?.[1]) return explicitUrl[1];
  const navigatedUrl = value.match(/Navigated to\s+(\S+)/i);
  return navigatedUrl?.[1];
}

function getLoopHandoffReason(
  repeatedErrors: number,
  sameErrorCount: number,
  mutationsSinceUrlChange: number,
) {
  if (repeatedErrors >= SAME_ERROR_LIMIT) {
    return "Browser mission stopped after repeated command failures.";
  }

  if (sameErrorCount >= SAME_ERROR_LIMIT) {
    return "Browser mission stopped after the same command error repeated.";
  }

  if (mutationsSinceUrlChange >= NO_PROGRESS_LIMIT) {
    return "Browser mission stopped after several actions without visible navigation progress.";
  }

  return undefined;
}

function formatAction(command: BrowserCommand, ok: boolean) {
  return `${ok ? "OK" : "FAILED"} ${command.name}`;
}

export const browserAgentService = new BrowserAgentService();
