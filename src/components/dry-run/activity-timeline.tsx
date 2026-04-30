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
        Search queries crawled
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
              <div className="space-y-1.5">
                {group.keywords.map((keyword) => (
                  <span
                    key={keyword}
                    className="block rounded-md border bg-muted/30 px-2.5 py-1.5 text-[11px] font-medium leading-4 text-muted-foreground"
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

export function groupedSearches(searches: Array<{ source: SourceId; query: string }>) {
  return searches.reduce<Array<{ source: SourceId; keywords: string[] }>>((groups, search) => {
    const existing = groups.find((group) => group.source === search.source);
    const keywords = expandSearchQueries(search.query);

    if (existing) {
      existing.keywords = Array.from(new Set([...existing.keywords, ...keywords]));
      return groups;
    }

    return [...groups, { source: search.source, keywords }];
  }, []);
}

export function expandSearchQueries(query: string) {
  const additions: Record<string, string[]> = {
    "salon missed calls receptionist alternative": [
      'site:reddit.com/r/salonowners "missed calls" "salon"',
      '"salon receptionist alternative" booking calls',
      '"how do you handle calls" salon client',
    ],
    "AI receptionist local business salon": [
      '"AI receptionist" "local business" salon',
      '"missed calls" "AI receptionist" small business',
      '"front desk automation" salon booking',
    ],
    "AI agents local businesses missed revenue": [
      '"AI agents" "local businesses" missed revenue',
      '"missed revenue" "phone calls" business',
      '"boring AI agent" practical use case',
    ],
    "booking SMS missed call issue": [
      'repo:booking "missed call" "SMS fallback"',
      '"appointment booking" "missed call" issue',
      '"Twilio" "booking" "missed call"',
    ],
    "salon answering service booking follow up": [
      '"salon answering service" booking follow up',
      '"after hours" "salon booking" phone',
      '"missed call" "book appointment" salon',
    ],
  };

  return additions[query] ?? [query];
}
