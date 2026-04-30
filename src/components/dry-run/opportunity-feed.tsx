"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpRight,
  Check,
  Copy,
  FileText,
  MessageSquare,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { opportunities } from "@/lib/dry-run/demo-data";
import type { OpportunityCard } from "@/lib/dry-run/types";
import { cn } from "@/lib/utils";
import { SourceIcon, sourceLabel } from "./source-icon";

export function OpportunityFeed({ visibleIds }: { visibleIds: string[] }) {
  const visible = opportunities.filter((opportunity) => visibleIds.includes(opportunity.id));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = visible.find((opportunity) => opportunity.id === selectedId) ?? visible[0] ?? null;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs font-semibold text-muted-foreground">Review queue</div>
            <h2 className="mt-1 text-xl font-semibold tracking-normal">
              {visible.length ? `${visible.length} opportunities found` : "Searching for first opportunity"}
            </h2>
          </div>
          <div className="flex gap-2">
            <QueueMetric label="Comments" value={visible.filter((item) => item.type === "comment").length} />
            <QueueMetric label="Posts" value={visible.filter((item) => item.type === "post").length} />
            <QueueMetric label="Intel" value={visible.filter((item) => item.type === "competitive").length} />
          </div>
        </div>
      </div>

      <OpportunityDetail opportunity={selected} />

      <div className="rounded-lg border bg-card p-3 shadow-sm">
        <div className="mb-3 flex items-center justify-between px-1">
          <div className="text-sm font-semibold">Incoming items</div>
          <Badge variant="secondary">{visible.length} live</Badge>
        </div>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence initial={false}>
            {visible.map((opportunity) => (
              <CompactOpportunity
                key={opportunity.id}
                opportunity={opportunity}
                selected={selected?.id === opportunity.id}
                onSelect={() => setSelectedId(opportunity.id)}
              />
            ))}
          </AnimatePresence>
        </div>

        {visible.length === 0 && (
          <div className="rounded-md border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
            Opportunities will stream in as the agent searches.
          </div>
        )}
      </div>
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

function CompactOpportunity({
  opportunity,
  selected,
  onSelect,
}: {
  opportunity: OpportunityCard;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      onClick={onSelect}
      className={cn(
        "rounded-md border bg-background p-3 text-left transition hover:border-primary/60",
        selected && "border-primary bg-primary/10",
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <SourceIcon source={opportunity.source} className="h-4 w-4 shrink-0" />
          <span className="truncate text-xs font-semibold">{sourceLabel(opportunity.source)}</span>
        </div>
        {selected && <Check className="h-4 w-4 text-primary-foreground" />}
      </div>
      <div className="line-clamp-2 text-sm font-semibold tracking-normal">{opportunity.title}</div>
      <div className="mt-3 flex items-center justify-between">
        <TypeBadge type={opportunity.type} />
        <span className="text-xs font-semibold text-[#2e8b64]">{opportunity.fit} fit</span>
      </div>
    </motion.button>
  );
}

function OpportunityDetail({ opportunity }: { opportunity: OpportunityCard | null }) {
  const [variant, setVariant] = useState<keyof OpportunityCard["variants"] | "default">("default");
  const draft = useMemo(() => {
    if (!opportunity) return "";
    return variant === "default" ? opportunity.draft : opportunity.variants[variant];
  }, [opportunity, variant]);

  if (!opportunity) {
    return (
      <div className="rounded-lg border bg-card p-8 shadow-sm">
        <div className="text-sm font-semibold">Awaiting first opportunity</div>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          The review panel will fill once the agent finds something worth acting on.
        </p>
      </div>
    );
  }

  return (
    <motion.section
      key={opportunity.id}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border bg-card shadow-sm"
    >
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="p-5">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <SourceIcon source={opportunity.source} className="h-3 w-3" />
              {sourceLabel(opportunity.source)}
            </Badge>
            <TypeBadge type={opportunity.type} />
            <span className="text-xs text-muted-foreground">{opportunity.location}</span>
          </div>
          <h3 className="max-w-3xl text-2xl leading-tight font-semibold tracking-normal">
            {opportunity.title}
          </h3>
          <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">{opportunity.rationale}</p>

          <div className="mt-5 grid max-w-xl grid-cols-2 gap-2">
            <Score label="Fit" value={opportunity.fit} />
            <Score label="Risk" value={opportunity.risk} inverse />
          </div>
        </div>

        <div className="border-t bg-muted/20 p-5 lg:border-t-0 lg:border-l">
          <div className="rounded-md border bg-background p-3">
            <div className="mb-2 text-xs font-semibold text-muted-foreground">Suggested action</div>
            <p className="text-sm leading-6">{opportunity.action}</p>
          </div>
          <div className="mt-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
              Draft
            </div>
            <motion.div
              key={`${opportunity.id}-${variant}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-md border bg-background p-3 text-sm leading-6 text-muted-foreground"
            >
              {draft}
            </motion.div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {(["shorter", "softer", "technical", "direct"] as const).map((item) => (
              <Button key={item} variant="outline" size="sm" onClick={() => setVariant(item)}>
                {item}
              </Button>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <Button className="flex-1">
              <Copy className="h-4 w-4" />
              Copy
            </Button>
            <Button variant="outline" className="flex-1">
              <ArrowUpRight className="h-4 w-4" />
              Open
            </Button>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
