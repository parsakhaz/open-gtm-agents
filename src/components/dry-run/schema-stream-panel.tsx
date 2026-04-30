"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { schemaSections } from "@/lib/dry-run/demo-data";

export function SchemaStreamPanel({
  visibleIds,
  compact = false,
}: {
  visibleIds: string[];
  compact?: boolean;
}) {
  const visible = schemaSections.filter((section) => visibleIds.includes(section.id));
  const next = schemaSections.find((section) => !visibleIds.includes(section.id));

  return (
    <div className={`flex h-full flex-col rounded-lg border bg-white/80 shadow-sm backdrop-blur ${compact ? "min-h-[170px]" : "min-h-[560px]"}`}>
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-muted-foreground">GTM profile</div>
            <h2 className="mt-1 text-lg font-semibold tracking-normal">What we learned</h2>
          </div>
          <Badge variant="success" className="gap-1">
            <Sparkles className="h-3 w-3" />
            Live
          </Badge>
        </div>
      </div>
      <div className={`min-h-0 flex-1 gap-3 overflow-y-auto p-4 ${compact ? "grid md:grid-cols-2 xl:grid-cols-3" : "space-y-3"}`}>
        <AnimatePresence initial={false}>
          {visible.map((section) => (
            <motion.div
              key={section.id}
              initial={{ opacity: 0, y: 12, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              className="rounded-lg border bg-card p-3 shadow-sm"
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <CheckCircle2 className="h-4 w-4 text-[#2e8b64]" />
                  {section.label}
                </div>
                <Badge variant="outline">{section.confidence}%</Badge>
              </div>
              <p className="text-sm leading-6 text-muted-foreground">{section.answer}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {section.suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    className="cursor-pointer rounded-full border bg-[#f9fbf8] px-2.5 py-1 text-[11px] font-medium text-[#315f4d] transition hover:border-primary"
                  >
                    + {suggestion}
                  </button>
                ))}
              </div>
              <div className="mt-3 text-[11px] text-muted-foreground">Source: {section.source}</div>
            </motion.div>
          ))}
        </AnimatePresence>
        {next && (
          <motion.div
            key={next.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-lg border border-dashed bg-muted/40 p-3"
          >
            <div className="h-3 w-32 animate-pulse rounded bg-muted-foreground/20" />
            <div className="mt-3 h-3 w-full animate-pulse rounded bg-muted-foreground/10" />
            <div className="mt-2 h-3 w-4/5 animate-pulse rounded bg-muted-foreground/10" />
          </motion.div>
        )}
      </div>
    </div>
  );
}
