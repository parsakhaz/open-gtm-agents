import type {
  BrowserMissionRequest,
  BrowserRunEvent,
  PostCommentRequest,
} from "@/lib/browser-relay/types";
import { debugLog, durationMs, previewForLog } from "@/lib/debug-log";
import { buildPostCommentMission } from "./browser-mission";

type EmitBrowserEvent = (event: BrowserRunEvent) => void;

export class BrowserOrchestratorService {
  async createPostCommentMission(
    input: PostCommentRequest,
    emit: EmitBrowserEvent,
  ): Promise<BrowserMissionRequest> {
    const startedAt = Date.now();
    const model = process.env.OPENAI_HIGH_QUALITY_MODEL || "gpt-5.5";
    const mission = buildPostCommentMission(input);

    emit({
      type: "orchestrator_decision",
      message: `Prepared browser mission with ${model}.`,
      createdAt: new Date().toISOString(),
    });

    debugLog("browser-orchestrator", "post-comment mission prepared", {
      model,
      durationMs: durationMs(startedAt),
      mission: previewForLog(mission, 1_000),
    });

    return mission;
  }
}

export const browserOrchestratorService = new BrowserOrchestratorService();
