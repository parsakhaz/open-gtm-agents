export type ResearchSourceId =
  | "reddit"
  | "x"
  | "hacker_news"
  | "github"
  | "web";

export type ResearchObjective =
  | "onboarding"
  | "opportunity_discovery"
  | "competitive_intel";

export type ResearchMode = "demo" | "auto" | "live";

export type ResearchRunRequest = {
  websiteUrl: string;
  mode: ResearchMode;
  objective: ResearchObjective;
};

export type GTMProfileField = {
  id: string;
  label: string;
  value: string;
  confidence: number;
  source: string;
  suggestions: string[];
};

export type SourceReference = {
  id: string;
  source: ResearchSourceId;
  title: string;
  url: string;
  snippet: string;
  fetchedContent?: string;
  publishedAt?: string;
  qualityScore?: number;
  qualityReasons?: string[];
};

export type OpportunityEvidence = {
  url: string;
  note: string;
  quote?: string;
};

export type ResearchOpportunity = {
  id: string;
  type: "comment" | "post" | "competitive";
  source: ResearchSourceId;
  title: string;
  location: string;
  url: string;
  rationale: string;
  suggestedAction: string;
  draft: string;
  fitScore: number;
  riskScore: number;
  evidence: OpportunityEvidence[];
  variants: {
    shorter: string;
    softer: string;
    technical: string;
    direct: string;
  };
};

export type OpportunityDraft = {
  id: string;
  opportunityId: string;
  draftType: "comment" | "post" | "competitive_note";
  content: string;
  disclosureNote?: string;
  status: "draft" | "approved" | "copied" | "dismissed";
  createdAt: string;
};

export type VerifiedResearchReport = {
  content: string;
  sources: string[];
  limitations?: string;
  metadata: {
    mode: ResearchMode;
    promptVersion: string;
    model?: string;
    searchedQueries: string[];
  };
};

export type SourceSearch = {
  source: ResearchSourceId;
  query: string;
};

export type ResearchRunSummary = {
  runId: string;
  profileFieldCount: number;
  sourceResultCount: number;
  opportunityCount: number;
  promptVersion: string;
  mode: ResearchMode;
};

export type ResearchRunRecord = {
  id: string;
  websiteUrl: string;
  objective: ResearchObjective;
  mode: ResearchMode;
  status: "queued" | "running" | "completed" | "failed";
  promptVersion: string;
  model?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
};

export type ResearchRunEvent =
  | {
      type: "status";
      runId: string;
      stage: string;
      message: string;
      createdAt: string;
    }
  | {
      type: "profile_update";
      runId: string;
      field: GTMProfileField;
      createdAt: string;
    }
  | {
      type: "source_search";
      runId: string;
      source: ResearchSourceId;
      query: string;
      createdAt: string;
    }
  | {
      type: "source_result";
      runId: string;
      source: SourceReference;
      createdAt: string;
    }
  | {
      type: "opportunity";
      runId: string;
      opportunity: ResearchOpportunity;
      createdAt: string;
    }
  | {
      type: "done";
      runId: string;
      result: ResearchRunSummary;
      createdAt: string;
    }
  | {
      type: "error";
      runId?: string;
      message: string;
      createdAt: string;
    };
