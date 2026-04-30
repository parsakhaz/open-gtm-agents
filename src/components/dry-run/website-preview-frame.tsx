"use client";

import { motion } from "framer-motion";
import { Check, Circle, ExternalLink, Loader2, Lock, RotateCw } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { demoUrl, schemaSections, websiteSections } from "@/lib/dry-run/demo-data";
import { cn } from "@/lib/utils";

const agentPages = [
  { id: "home", label: "Homepage", url: demoUrl },
  { id: "features", label: "Features", url: `${demoUrl}#features` },
  { id: "reviews", label: "Reviews", url: `${demoUrl}#reviews` },
  { id: "pricing", label: "Pricing", url: `${demoUrl}#pricing` },
  { id: "contact", label: "Contact", url: `${demoUrl}#contact` },
];

export function WebsitePreviewFrame({
  activeSection,
  scroll,
  locked,
}: {
  activeSection: string;
  scroll: number;
  locked: boolean;
}) {
  const activeIndex = Math.max(
    0,
    websiteSections.findIndex((section) => section.id === activeSection),
  );
  const learningSections = schemaSections.slice(0, websiteSections.length);
  const activePageId = useMemo(() => pageIdForSection(activeSection), [activeSection]);
  const [reloadKey, setReloadKey] = useState(0);
  const activePage = agentPages.find((page) => page.id === activePageId) ?? agentPages[0];
  const iframeUrl = `${demoUrl}${reloadKey > 0 ? `?reload=${reloadKey}` : ""}`;
  const agentOffset = Math.round((Math.min(100, Math.max(0, scroll)) / 100) * 980);

  return (
    <div className="mx-auto grid min-h-[600px] w-full max-w-7xl items-center gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: "easeOut" }}
        className="overflow-hidden rounded-lg border border-[#e8ded7] bg-[#fdfaf5] shadow-lg"
      >
        <div className="flex min-h-11 items-center gap-3 border-b bg-[#f6f0ea] px-4 py-2">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff6b5f]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#f3bf4f]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#5ecf81]" />
          </div>
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-md bg-white px-3 py-1.5 text-xs text-muted-foreground shadow-sm">
            <Lock className="h-3 w-3" />
            <span className="truncate">{activePage.url}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setReloadKey((current) => current + 1)}
            aria-label="Reload preview"
          >
            <RotateCw className="h-4 w-4 text-muted-foreground" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => window.open(activePage.url, "_blank", "noopener,noreferrer")}
            aria-label="Open preview in browser"
          >
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>

        <div className={cn("relative h-[680px] bg-[#fffcf7]", locked ? "overflow-hidden" : "overflow-auto")}>
          <motion.div
            animate={locked ? { y: -agentOffset } : { y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "mx-auto h-[1364px] w-[893px] origin-top overflow-hidden rounded-sm bg-white shadow-sm",
              locked ? "pointer-events-none" : "",
            )}
          >
            <div className="h-[2200px] w-[1440px] origin-top-left scale-[0.62]">
              <iframe
                src={iframeUrl}
                title="Salon Agent live website preview"
                className="h-full w-full border-0 bg-white"
                loading="eager"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </motion.div>
          <div className="pointer-events-none absolute inset-x-4 top-4 z-10 flex items-center">
            <Badge variant="outline" className="border-[#eac7bd] bg-white/85 text-[#9e423b] shadow-sm backdrop-blur">
              {locked ? "Agent browsing site" : "Unlocked browser preview"}
            </Badge>
          </div>
          {locked && (
            <div className="absolute inset-0 z-20 flex items-end justify-center bg-transparent p-4">
              <div className="rounded-full border bg-white/90 px-4 py-2 text-xs font-semibold text-muted-foreground shadow-sm backdrop-blur">
                Scrolling is locked while the agent reads this page
              </div>
            </div>
          )}
        </div>
      </motion.div>

      <div className="relative w-full max-w-[360px] justify-self-center">
        <p className="mb-6 text-pretty text-sm leading-6 text-[#6e5a55] italic">
          &ldquo;Most salons don&apos;t lose clients. They just couldn&apos;t answer the phone.&rdquo;
        </p>
        <div className="space-y-4">
          {learningSections.map((section, index) => {
            const matchingWebsiteSection = websiteSections[index];
            const isActive = locked && matchingWebsiteSection?.id === activeSection;
            const isDone = !locked || index < activeIndex;

            return (
              <motion.div
                key={section.id}
                animate={{ opacity: 1 }}
                className="grid min-h-[88px] grid-cols-[40px_minmax(0,1fr)] gap-4"
              >
                <div className="flex h-full flex-col items-center">
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-[#fff8f3]",
                      isActive && "border-primary bg-primary text-primary-foreground",
                      isDone && "border-primary bg-primary/20 text-primary-foreground",
                    )}
                  >
                    {isDone ? (
                      <Check className="h-5 w-5" />
                    ) : isActive ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Circle className="h-3 w-3 fill-current" />
                    )}
                  </div>
                  {index < learningSections.length - 1 && (
                    <div className="mt-2 min-h-8 w-px flex-1 bg-border" />
                  )}
                </div>
                <div className="min-w-0 pb-1 pt-2">
                  <div className="text-[11px] font-bold tracking-[0.08em] text-foreground uppercase">
                    {section.label}
                  </div>
                  {isActive && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-2 max-w-[280px] text-sm leading-6 text-foreground"
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

function pageIdForSection(sectionId: string) {
  if (sectionId === "how-it-works") return "features";
  if (sectionId === "social-proof") return "reviews";
  if (sectionId === "stats") return "pricing";
  if (sectionId === "footer") return "contact";
  return "home";
}
