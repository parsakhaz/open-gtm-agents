"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CircleDotDashed, Search } from "lucide-react";
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
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        <Search className="h-3.5 w-3.5" />
        Keywords crawled
      </div>
      <div className="space-y-3">
        <AnimatePresence initial={false}>
          {groupedSearches(searches).map((group) => (
            <motion.div
              key={group.source}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="rounded-md border bg-background p-3"
            >
              <div className="mb-2 flex items-center gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted">
                  <SourceIcon source={group.source} className="h-4 w-4" />
                </div>
                <Badge variant="secondary">{sourceLabel(group.source)}</Badge>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {group.keywords.map((keyword) => (
                  <span
                    key={keyword}
                    className="rounded-full border bg-muted/40 px-2 py-1 text-[11px] font-medium text-muted-foreground"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function groupedSearches(searches: Array<{ source: SourceId; query: string }>) {
  return searches.reduce<Array<{ source: SourceId; keywords: string[] }>>((groups, search) => {
    const existing = groups.find((group) => group.source === search.source);
    const keywords = splitKeywords(search.query);

    if (existing) {
      existing.keywords = Array.from(new Set([...existing.keywords, ...keywords]));
      return groups;
    }

    return [...groups, { source: search.source, keywords }];
  }, []);
}

function splitKeywords(query: string) {
  const stopWords = new Set(["ai", "and", "or", "the", "for"]);
  return query
    .split(/\s+/)
    .map((word) => word.trim().toLowerCase())
    .filter((word) => word.length > 2 && !stopWords.has(word))
    .slice(0, 5);
}
