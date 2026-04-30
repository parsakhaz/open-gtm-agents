"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Copy, FileText, MessageSquare, ShieldAlert, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BrowserPostActions } from "@/components/browser/browser-post-actions";
import { opportunities } from "@/lib/dry-run/demo-data";
import type { OpportunityCard } from "@/lib/dry-run/types";
import { cn } from "@/lib/utils";
import { SourceIcon, sourceLabel } from "./source-icon";

export function OpportunityFeed({
  visibleIds,
  selectedId,
  rewriteVariant,
  approvalState,
  items = opportunities,
  showHeader = true,
}: {
  visibleIds: string[];
  selectedId?: string;
  rewriteVariant?: keyof OpportunityCard["variants"];
  approvalState?: "idle" | "reviewing" | "rewriting" | "copied";
  items?: OpportunityCard[];
  showHeader?: boolean;
}) {
  const visible = items.filter((opportunity) => visibleIds.includes(opportunity.id));
  const [userSelectedId, setUserSelectedId] = useState<string | null | undefined>(undefined);
  const activeId = userSelectedId !== undefined ? userSelectedId : selectedId;

  return (
    <div className="space-y-3">
      {showHeader && (
        <div className="rounded-lg border bg-card/85 p-4 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold text-muted-foreground">Review queue</div>
              <h2 className="mt-1 text-lg font-semibold tracking-normal">
                {visible.length ? `${visible.length} opportunities found` : "Searching..."}
              </h2>
            </div>
            <div className="hidden gap-2 opacity-70 md:flex">
              <QueueMetric label="Comments" value={visible.filter((item) => item.type === "comment").length} />
              <QueueMetric label="Posts" value={visible.filter((item) => item.type === "post").length} />
              <QueueMetric label="Intel" value={visible.filter((item) => item.type === "competitive").length} />
            </div>
          </div>
        </div>
      )}

        <AnimatePresence initial={false}>
          {visible.map((opportunity) => {
            const isActive = activeId === opportunity.id;
            const hasExpandedCard = Boolean(activeId);

            return (
              <motion.div
                key={opportunity.id}
                layout
                initial={{ opacity: 0, y: 18, scale: 0.98 }}
                animate={{ opacity: !hasExpandedCard || isActive ? 1 : 0.72, y: 0, scale: 1 }}
                transition={{ duration: 0.28 }}
                className={cn(
                  "rounded-lg border bg-card shadow-sm transition hover:opacity-100 hover:shadow-md",
                  isActive && "border-primary/50 bg-primary/10",
                )}
              >
                <button
                  type="button"
                  aria-expanded={isActive}
                  onClick={() => setUserSelectedId((current) => (current === opportunity.id ? null : opportunity.id))}
                  className="w-full cursor-pointer p-4 text-left"
                >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="gap-1">
                        <SourceIcon source={opportunity.source} className="h-3 w-3" />
                        {sourceLabel(opportunity.source)}
                      </Badge>
                      <TypeBadge type={opportunity.type} />
                      <span className="text-xs text-muted-foreground">{opportunity.location}</span>
                    </div>
                    <h3 className="text-base font-semibold tracking-normal">{opportunity.title}</h3>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                      {opportunity.rationale}
                    </p>
                  </div>
                  <div className="grid shrink-0 grid-cols-2 gap-2 text-center opacity-80">
                    <Score label="Fit" value={opportunity.fit} />
                    <Score label="Risk" value={opportunity.risk} inverse />
                  </div>
                </div>
                </button>
                <AnimatePresence initial={false}>
                  {isActive && (
                    <OpportunityDetail
                      opportunity={opportunity}
                      scriptedVariant={opportunity.id === selectedId ? rewriteVariant : undefined}
                      approvalState={opportunity.id === selectedId ? approvalState : undefined}
                    />
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {visible.length === 0 && (
          <div className="rounded-lg border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
            Opportunities will stream in as the agent searches.
          </div>
        )}
    </div>
  );
}

function TypeBadge({ type }: { type: OpportunityCard["type"] }) {
  if (type === "post") {
    return (
      <Badge variant="warning" className="gap-1">
        <FileText className="h-3 w-3" />
        Post idea
      </Badge>
    );
  }

  if (type === "competitive") {
    return (
      <Badge variant="secondary" className="gap-1">
        <ShieldAlert className="h-3 w-3" />
        Intel
      </Badge>
    );
  }

  return (
    <Badge variant="success" className="gap-1">
      <MessageSquare className="h-3 w-3" />
      Comment
    </Badge>
  );
}

function Score({ label, value, inverse }: { label: string; value: number; inverse?: boolean }) {
  const good = inverse ? value < 35 : value > 75;

  return (
    <div className="rounded-md border bg-background px-3 py-2">
      <div className={cn("text-sm font-bold", good ? "text-[#2e8b64]" : "text-[#8a5a1f]")}>{value}</div>
      <div className="text-[10px] font-medium text-muted-foreground uppercase">{label}</div>
    </div>
  );
}

function QueueMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-16 rounded-md border bg-background px-3 py-2 text-center">
      <div className="text-sm font-bold">{value}</div>
      <div className="text-[10px] font-medium text-muted-foreground uppercase">{label}</div>
    </div>
  );
}

function OpportunityDetail({
  opportunity,
  scriptedVariant,
  approvalState,
}: {
  opportunity: OpportunityCard | null;
  scriptedVariant?: keyof OpportunityCard["variants"];
  approvalState?: "idle" | "reviewing" | "rewriting" | "copied";
}) {
  const [variant, setVariant] = useState<keyof OpportunityCard["variants"] | "default">("default");
  const [copiedDraft, setCopiedDraft] = useState("");
  const generatedDraft = useMemo(() => {
    if (!opportunity) return "";
    const activeVariant = scriptedVariant ?? variant;
    return activeVariant === "default" ? opportunity.draft : opportunity.variants[activeVariant];
  }, [opportunity, scriptedVariant, variant]);
  const [editedDrafts, setEditedDrafts] = useState<Record<string, string>>({});
  const draft = opportunity ? editedDrafts[opportunity.id] ?? generatedDraft : "";
  const copied = copiedDraft === draft || approvalState === "copied";

  function applyVariant(nextVariant: keyof OpportunityCard["variants"] | "default") {
    if (!opportunity) return;
    setVariant(nextVariant);
    const nextDraft = nextVariant === "default" ? opportunity.draft : opportunity.variants[nextVariant];
    setEditedDrafts((current) => ({ ...current, [opportunity.id]: nextDraft }));
  }

  if (!opportunity) {
    return (
      <div className="rounded-lg border bg-card p-5 shadow-sm">
        <div className="text-sm font-semibold">Awaiting first opportunity</div>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          The review panel will fill once the agent finds something worth acting on.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      key={opportunity.id}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      className="border-t bg-background/60 p-4"
    >
      {(approvalState === "rewriting" || approvalState === "copied") && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {approvalState === "rewriting" && <Badge variant="warning">Making it natural</Badge>}
          {approvalState === "copied" && <Badge variant="success">Copied</Badge>}
        </div>
      )}

      <div className="mb-4 grid gap-3 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="rounded-lg border bg-card p-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <SourceIcon source={opportunity.source} className="h-3.5 w-3.5" />
              Source
            </div>
            {opportunity.sourceContent.context && (
              <span className="truncate text-xs text-muted-foreground">{opportunity.sourceContent.context}</span>
            )}
          </div>
          <p className="line-clamp-4 text-sm leading-6 text-muted-foreground">
            {opportunity.sourceContent.body}
          </p>
          {opportunity.sourceContent.author && (
            <div className="mt-2 text-xs font-medium text-muted-foreground">{opportunity.sourceContent.author}</div>
          )}
        </div>

        <div className="rounded-lg border bg-card p-3">
          <div className="mb-2 text-xs font-semibold text-muted-foreground">Summary</div>
          <p className="text-sm leading-6 text-muted-foreground">{opportunity.rationale}</p>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-3 shadow-sm">
        <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
            Draft
          </div>
          <div className="flex flex-wrap gap-2">
            {(["shorter", "softer", "technical", "direct"] as const).map((item) => (
              <Button
                key={item}
                variant={variant === item ? "secondary" : "outline"}
                size="sm"
                className="h-8 border px-3 capitalize shadow-sm"
                onClick={() => applyVariant(item)}
              >
                {item}
              </Button>
            ))}
          </div>
        </div>
        <textarea
          value={draft}
          onChange={(event) => {
            setEditedDrafts((current) => ({ ...current, [opportunity.id]: event.target.value }));
          }}
          className="min-h-[128px] w-full resize-y rounded-md border bg-background p-3 text-sm leading-7 text-foreground shadow-inner outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/25"
          aria-label="Editable draft"
        />

        <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-start">
          <div className="min-w-0 flex-1">
            <BrowserPostActions
              url={opportunity.url}
              comment={draft}
              opportunityId={opportunity.id}
            />
          </div>
          <Button
            variant="outline"
            className="md:w-40"
            onClick={async () => {
              await navigator.clipboard?.writeText(draft);
              setCopiedDraft(draft);
            }}
          >
            {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy draft"}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
