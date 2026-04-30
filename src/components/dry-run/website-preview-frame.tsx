"use client";

import { motion } from "framer-motion";
import { Check, Circle, Loader2, Lock, Search } from "lucide-react";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { demoUrl, schemaSections, websiteSections } from "@/lib/dry-run/demo-data";
import { cn } from "@/lib/utils";

export function WebsitePreviewFrame({
  activeSection,
  scroll,
}: {
  activeSection: string;
  scroll: number;
}) {
  const activeIndex = Math.max(
    0,
    websiteSections.findIndex((section) => section.id === activeSection),
  );
  const iframeOffset = useMemo(() => {
    return Math.min(activeIndex * 250, 1125);
  }, [activeIndex]);
  const learningSections = schemaSections.slice(0, websiteSections.length);

  return (
    <div className="mx-auto grid min-h-[600px] w-full max-w-7xl items-center gap-8 lg:grid-cols-[minmax(0,1fr)_250px]">
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: "easeOut" }}
        className="overflow-hidden rounded-lg border border-[#e8ded7] bg-[#fdfaf5] shadow-lg"
      >
        <div className="flex h-11 items-center gap-3 border-b bg-[#f6f0ea] px-4">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff6b5f]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#f3bf4f]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#5ecf81]" />
          </div>
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-md bg-white px-3 py-1.5 text-xs text-muted-foreground shadow-sm">
            <Lock className="h-3 w-3" />
            <span className="truncate">{demoUrl}</span>
          </div>
          <Search className="h-4 w-4 text-muted-foreground" />
        </div>

        <div className="relative h-[560px] overflow-hidden bg-[#fffcf7]">
          <div className="absolute top-0 left-1/2 h-[2200px] w-[1440px] -translate-x-1/2">
            <motion.div
              animate={{ y: -iframeOffset }}
              transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
              className="h-full w-full origin-top scale-[0.76] overflow-hidden rounded-sm bg-white"
            >
              <iframe
                src={demoUrl}
                title="Salon Agent live website preview"
                className="h-full w-full border-0 bg-white"
                loading="eager"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </motion.div>
          </div>
          <div className="pointer-events-none absolute inset-x-4 top-4 z-10 flex items-center justify-between">
            <Badge variant="outline" className="border-[#eac7bd] bg-white/85 text-[#9e423b] shadow-sm backdrop-blur">
              Reading live website
            </Badge>
            <Badge variant="secondary" className="bg-white/85 shadow-sm backdrop-blur">
              {learningSections[activeIndex]?.label}
            </Badge>
          </div>
        </div>
      </motion.div>

      <div className="relative">
        <p className="mb-6 text-sm leading-6 text-[#6e5a55] italic">
          &ldquo;Most salons don&apos;t lose clients. They just couldn&apos;t answer the phone.&rdquo;
        </p>
            <div className="absolute top-14 bottom-0 left-[11px] w-px bg-border" />
        <div className="space-y-4">
          {learningSections.map((section, index) => {
            const matchingWebsiteSection = websiteSections[index];
            const isActive = matchingWebsiteSection?.id === activeSection;
            const isDone = index < activeIndex;

            return (
              <motion.div
                key={section.id}
                animate={{ opacity: index <= activeIndex + 1 ? 1 : 0.5 }}
                className="relative flex gap-3"
              >
                <div
                  className={cn(
                    "z-10 flex h-6 w-6 items-center justify-center rounded-full border bg-[#fff8f3]",
                    isActive && "border-primary bg-primary text-primary-foreground",
                    isDone && "border-primary bg-primary/20 text-primary-foreground",
                  )}
                >
                  {isDone ? (
                    <Check className="h-3 w-3" />
                  ) : isActive ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Circle className="h-2.5 w-2.5 fill-current" />
                  )}
                </div>
                <div className="min-w-0 pb-1">
                  <div className="text-[11px] font-bold tracking-[0.08em] text-foreground uppercase">
                    {section.label}
                  </div>
                  {isActive && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-1 text-xs text-muted-foreground"
                    >
                      {section.answer}
                    </motion.div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
