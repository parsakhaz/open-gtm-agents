import type {
  BrowserRunEvent,
  PostCommentRequest,
} from "@/lib/browser-relay/types";
import { browserAgentService } from "@/server/browser/browser-agent-service";

export const maxDuration = 300;

export async function POST(request: Request) {
  let input: PostCommentRequest;

  try {
    input = parsePostCommentRequest(await request.json());
  } catch (error) {
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
        await browserAgentService.postComment(input, emit);
      } catch (error) {
        emit({
          type: "browser_error",
          message:
            error instanceof Error ? error.message : "Browser posting failed.",
          createdAt: new Date().toISOString(),
        });
      } finally {
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
