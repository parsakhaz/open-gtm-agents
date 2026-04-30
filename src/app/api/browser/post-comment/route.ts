import type {
  BrowserRunEvent,
  PostCommentRequest,
} from "@/lib/browser-relay/types";
import { debugLog, durationMs } from "@/lib/debug-log";
import { browserAgentService } from "@/server/browser/browser-agent-service";
import { browserOrchestratorService } from "@/server/browser/browser-orchestrator-service";

export const maxDuration = 300;

export async function POST(request: Request) {
  let input: PostCommentRequest;
  const startedAt = Date.now();

  try {
    input = parsePostCommentRequest(await request.json());
    debugLog("browser-api", "post-comment request accepted", {
      url: input.url,
      commentLength: input.comment.length,
      opportunityId: input.opportunityId,
    });
  } catch (error) {
    debugLog("browser-api", "post-comment request rejected", {
      error: error instanceof Error ? error.message : String(error),
    }, "warn");
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Invalid post request.",
      },
      { status: 400 },
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (event: BrowserRunEvent) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };

      try {
        const mission = await browserOrchestratorService.createPostCommentMission(
          input,
          emit,
        );
        await browserAgentService.runMission(mission, emit);
      } catch (error) {
        debugLog("browser-api", "post-comment stream failed", {
          durationMs: durationMs(startedAt),
          error: error instanceof Error ? error.message : String(error),
        }, "error");
        emit({
          type: "browser_error",
          message:
            error instanceof Error ? error.message : "Browser posting failed.",
          createdAt: new Date().toISOString(),
        });
      } finally {
        debugLog("browser-api", "post-comment stream closed", {
          durationMs: durationMs(startedAt),
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "X-Accel-Buffering": "no",
    },
  });
}

function parsePostCommentRequest(value: unknown): PostCommentRequest {
  if (!isRecord(value)) {
    throw new Error("Request body must be a JSON object.");
  }

  if (typeof value.url !== "string") {
    throw new Error("url is required.");
  }

  let url: string;
  try {
    url = new URL(value.url).toString();
  } catch {
    throw new Error("url must be a valid URL.");
  }

  if (typeof value.comment !== "string" || value.comment.trim().length === 0) {
    throw new Error("comment is required.");
  }

  return {
    url,
    comment: value.comment,
    opportunityId:
      typeof value.opportunityId === "string" ? value.opportunityId : undefined,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
