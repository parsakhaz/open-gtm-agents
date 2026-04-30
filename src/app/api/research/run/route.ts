import type {
  ResearchMode,
  ResearchObjective,
  ResearchRunEvent,
  ResearchRunRequest,
} from "@/lib/research/types";
import { gtmResearchService } from "@/server/research/gtm-research-service";

export const maxDuration = 300;

const researchModes = new Set<ResearchMode>(["demo", "auto", "live"]);
const researchObjectives = new Set<ResearchObjective>([
  "onboarding",
  "opportunity_discovery",
  "competitive_intel",
]);

export async function POST(request: Request) {
  let input: ResearchRunRequest;

  try {
    input = parseResearchRunRequest(await request.json());
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Invalid research request.",
      },
      { status: 400 },
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const markClosed = () => {
        closed = true;
      };
      request.signal.addEventListener("abort", markClosed, { once: true });

      const emit = (event: ResearchRunEvent) => {
        if (closed || request.signal.aborted) return;
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };

      try {
        await gtmResearchService.run(input, emit);
      } catch (error) {
        if (!closed && !request.signal.aborted) emit({
          type: "error",
          message:
            error instanceof Error ? error.message : "Research run failed.",
          createdAt: new Date().toISOString(),
        });
      } finally {
        request.signal.removeEventListener("abort", markClosed);
        if (!closed) {
          closed = true;
          controller.close();
        }
      }
    },
    cancel() {
      // The running provider work is allowed to finish; emit becomes a no-op.
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

function parseResearchRunRequest(value: unknown): ResearchRunRequest {
  if (!isRecord(value)) {
    throw new Error("Request body must be a JSON object.");
  }

  if (typeof value.websiteUrl !== "string") {
    throw new Error("websiteUrl is required.");
  }

  let websiteUrl: string;
  try {
    websiteUrl = new URL(value.websiteUrl).toString();
  } catch {
    throw new Error("websiteUrl must be a valid URL.");
  }

  const mode = typeof value.mode === "string" ? value.mode : "demo";
  if (!researchModes.has(mode as ResearchMode)) {
    throw new Error("mode must be demo, auto, or live.");
  }

  const objective =
    typeof value.objective === "string" ? value.objective : "onboarding";
  if (!researchObjectives.has(objective as ResearchObjective)) {
    throw new Error(
      "objective must be onboarding, opportunity_discovery, or competitive_intel.",
    );
  }

  return {
    websiteUrl,
    mode: mode as ResearchMode,
    objective: objective as ResearchObjective,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
