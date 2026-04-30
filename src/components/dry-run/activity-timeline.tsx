"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CircleDotDashed } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { SourceId } from "@/lib/dry-run/types";
import { SourceIcon, sourceLabel } from "./source-icon";

export function ActivityTimeline({
  searches,
  activeStage,
  activeMessage,
}: {
  searches: Array<{ source: SourceId; query: string }>;
  activeStage: string;
  activeMessage: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold text-muted-foreground">Agent activity</div>
          <div className="mt-1 text-sm font-semibold">{activeStage}</div>
        </div>
        <CircleDotDashed className="h-5 w-5 animate-spin text-primary-foreground" />
      </div>
      <p className="mb-4 text-sm leading-6 text-muted-foreground">{activeMessage}</p>
      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {searches.slice(-6).map((search, index) => (
            <motion.div
              key={`${search.source}-${search.query}-${index}`}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-start gap-2 rounded-md border bg-background p-2"
            >
              <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted">
                <SourceIcon source={search.source} className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0">
                <Badge variant="secondary">{sourceLabel(search.source)}</Badge>
                <div className="mt-1 truncate text-xs text-muted-foreground">{search.query}</div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
