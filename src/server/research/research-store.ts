import type {
  GTMProfileField,
  OpportunityDraft,
  ResearchMode,
  ResearchObjective,
  ResearchOpportunity,
  ResearchRunEvent,
  ResearchRunRecord,
  SourceReference,
} from "@/lib/research/types";
import { RESEARCH_PROMPT_VERSION } from "./prompts";

type StoredRun = {
  run: ResearchRunRecord;
  events: ResearchRunEvent[];
  profileFields: GTMProfileField[];
  sourceResults: SourceReference[];
  opportunities: ResearchOpportunity[];
  drafts: OpportunityDraft[];
};

const runs = new Map<string, StoredRun>();

export class ResearchStore {
  createRun(input: {
    websiteUrl: string;
    objective: ResearchObjective;
    mode: ResearchMode;
    model?: string;
    metadata?: Record<string, unknown>;
  }): ResearchRunRecord {
    const now = new Date().toISOString();
    const run: ResearchRunRecord = {
      id: crypto.randomUUID(),
      websiteUrl: input.websiteUrl,
      objective: input.objective,
      mode: input.mode,
      status: "running",
      promptVersion: RESEARCH_PROMPT_VERSION,
      model: input.model,
      metadata: input.metadata ?? {},
      createdAt: now,
      startedAt: now,
    };

    runs.set(run.id, {
      run,
      events: [],
      profileFields: [],
      sourceResults: [],
      opportunities: [],
      drafts: [],
    });

    return run;
  }

  appendEvent(event: ResearchRunEvent) {
    const run = event.runId ? runs.get(event.runId) : undefined;
    run?.events.push(event);
  }

  saveProfileField(runId: string, field: GTMProfileField) {
    runs.get(runId)?.profileFields.push(field);
  }

  saveSourceResult(runId: string, source: SourceReference) {
    runs.get(runId)?.sourceResults.push(source);
  }

  saveOpportunity(runId: string, opportunity: ResearchOpportunity) {
    const run = runs.get(runId);
    if (!run) return;

    run.opportunities.push(opportunity);
    run.drafts.push({
      id: crypto.randomUUID(),
      opportunityId: opportunity.id,
      draftType:
        opportunity.type === "competitive" ? "competitive_note" : opportunity.type,
      content: opportunity.draft,
      disclosureNote:
        opportunity.type === "comment"
          ? "Disclose affiliation when replying in public communities."
          : undefined,
      status: "draft",
      createdAt: new Date().toISOString(),
    });
  }

  completeRun(runId: string) {
    const stored = runs.get(runId);
    if (!stored) return;

    stored.run.status = "completed";
    stored.run.completedAt = new Date().toISOString();
  }

  failRun(runId: string, message: string) {
    const stored = runs.get(runId);
    if (!stored) return;

    stored.run.status = "failed";
    stored.run.completedAt = new Date().toISOString();
    stored.run.metadata = {
      ...stored.run.metadata,
      error: message,
    };
  }

  getRun(runId: string) {
    return runs.get(runId);
  }
}

export const researchStore = new ResearchStore();
