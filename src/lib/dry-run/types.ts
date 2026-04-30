export type SourceId = "reddit" | "x" | "hacker_news" | "github" | "web" | "resend";

export type SchemaSection = {
  id: string;
  label: string;
  answer: string;
  confidence: number;
  source: string;
  suggestions: string[];
};

export type WebsiteSection = {
  id: string;
  label: string;
  eyebrow: string;
  headline: string;
  body: string;
  bullets: string[];
  cta?: string;
};

export type OpportunityCard = {
  id: string;
  type: "comment" | "post" | "competitive";
  source: SourceId;
  title: string;
  location: string;
  url: string;
  rationale: string;
  action: string;
  draft: string;
  fit: number;
  risk: number;
  variants: {
    shorter: string;
    softer: string;
    technical: string;
    direct: string;
  };
};

export type DryRunEvent =
  | { type: "status"; at: number; stage: string; message: string }
  | { type: "website_focus"; at: number; sectionId: string; scrollTo: number }
  | { type: "schema_answer"; at: number; sectionId: string }
  | { type: "source_search"; at: number; source: SourceId; query: string }
  | { type: "opportunity"; at: number; cardId: string }
  | { type: "phase"; at: number; phase: "onboarding" | "discovery" | "complete" };

export type VisibleState = {
  phase: "idle" | "onboarding" | "discovery" | "complete";
  activeStage: string;
  activeMessage: string;
  activeWebsiteSection: string;
  websiteScroll: number;
  schemaIds: string[];
  searches: Array<{ source: SourceId; query: string }>;
  opportunityIds: string[];
};
