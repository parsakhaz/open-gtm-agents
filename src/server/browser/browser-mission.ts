import type {
  BrowserMissionRequest,
  BrowserStructuredHandoff,
  PostCommentRequest,
} from "@/lib/browser-relay/types";

export function buildPostCommentMission(input: PostCommentRequest): BrowserMissionRequest {
  const { hostname } = new URL(input.url);

  return {
    mission: "Open the target URL and post the exact approved comment.",
    startUrl: input.url,
    exactTextToSubmit: input.comment,
    opportunityId: input.opportunityId,
    allowedDomains: [hostname],
    constraints: [
      "Do not rewrite, summarize, or embellish exactTextToSubmit.",
      "Do not follow, subscribe, send direct messages, purchase, delete, or change account settings.",
      "Use the target URL and only navigate as needed inside that same site to complete the mission.",
      "Stop and ask for user input if the page requires login, captcha, credentials, missing permissions, or ambiguous destructive confirmation.",
    ],
    successCriteria: [
      "The exact text is submitted as a comment or reply on the target page.",
      "The browser state after submission shows the posted text or no submission error.",
    ],
    stopConditions: [
      "login",
      "captcha",
      "credentials",
      "permissions",
      "ambiguity",
      "destructive_confirmation",
    ],
    maxTurns: 20,
  };
}

export function buildMissionUserMessage(mission: BrowserMissionRequest) {
  return `Complete this browser mission.

Mission:
${mission.mission}

Start URL:
${mission.startUrl ?? "No start URL provided. Use list_tabs first."}

Exact text to submit, if any:
${mission.exactTextToSubmit ?? "None"}

Allowed domains:
${mission.allowedDomains?.join(", ") || "Not specified"}

Constraints:
${mission.constraints.map((item) => `- ${item}`).join("\n")}

Success criteria:
${mission.successCriteria.map((item) => `- ${item}`).join("\n")}

Stop conditions:
${mission.stopConditions.map((item) => `- ${item}`).join("\n")}

When blocked or unsuccessful, produce a structured handoff with:
- stepsCompleted
- currentState
- approachesTried
- nextSteps

Return success=true only when the mission is fully complete.`;
}

export function defaultStructuredHandoff(
  description: string,
  actionsTaken: string[],
): BrowserStructuredHandoff {
  return {
    stepsCompleted: actionsTaken,
    currentState: {
      description,
    },
    approachesTried: actionsTaken.map((action) => ({
      approach: action,
      result: action.startsWith("OK") ? "success" : "failed",
      detail: action,
    })),
    nextSteps: ["Inspect the current browser state with snap and continue from the latest visible UI."],
  };
}
