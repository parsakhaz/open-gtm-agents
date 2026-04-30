"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  BellRing,
  ChevronDown,
  CheckCircle2,
  Clock3,
  Globe2,
  Loader2,
  Mail,
  Radar,
  RefreshCcw,
  Scissors,
  Target,
  Users,
} from "lucide-react";
import { FormEvent, useState } from "react";
import { SimpleIcon } from "@/components/brand/simple-icon";
import { groupedSearches } from "@/components/dry-run/activity-timeline";
import { OpportunityFeed } from "@/components/dry-run/opportunity-feed";
import { SchemaStreamPanel } from "@/components/dry-run/schema-stream-panel";
import { SourceIcon, sourceLabel } from "@/components/dry-run/source-icon";
import { WebsitePreviewFrame } from "@/components/dry-run/website-preview-frame";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { demoUrl, opportunities, schemaSections, searchStrategy, skippedOpportunities } from "@/lib/dry-run/demo-data";
import { useDryRun } from "@/lib/dry-run/use-dry-run";
import type { SourceReference } from "@/lib/research/types";
import { useRealResearchRun } from "@/lib/research/use-real-research-run";

type RunMode = "dry" | "real";

export default function Home() {
  const [url, setUrl] = useState(demoUrl);
  const [isRunning, setIsRunning] = useState(false);
  const [runMode, setRunMode] = useState<RunMode>("dry");
  const dryRun = useDryRun(isRunning && runMode === "dry");
  const realRun = useRealResearchRun({ url, isRunning: isRunning && runMode === "real" });
  const activeRun = runMode === "dry" ? dryRun : realRun;
  const { state, progress, gate, proceed } = activeRun;
  const liveSchemaSections = runMode === "real" ? realRun.schemaSections : undefined;
  const liveOpportunities = runMode === "real" ? realRun.opportunities : undefined;
  const liveSourceResults = runMode === "real" ? realRun.sourceResults : undefined;
  const opportunityCount = liveOpportunities?.length ?? opportunities.length;

  function startRun(event?: FormEvent) {
    event?.preventDefault();
    setIsRunning(false);
    window.setTimeout(() => setIsRunning(true), 20);
  }

  const isDiscovery = state.phase === "discovery" || state.phase === "complete";

  return (
    <main className="min-h-screen bg-[#fbf2ee] text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-[1480px] flex-col px-5 py-5">
        <header className="flex items-center justify-between gap-4 rounded-lg border bg-white/75 px-4 py-3 shadow-sm backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#1f2b24] text-primary">
              <Radar className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-bold tracking-normal">Open GTM Agents</div>
            </div>
          </div>
          {isRunning && (
            <RunControls
              gate={gate}
              progress={progress}
              onProceed={proceed}
              onRestart={() => startRun()}
            />
          )}
        </header>

        {!isRunning ? (
          <section className="grid flex-1 place-items-center bg-white py-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="w-full"
            >
              <div className="grid min-h-[720px] place-items-center px-6">
                <div className="w-full max-w-xl">
                  <h1 className="text-4xl leading-tight font-semibold tracking-normal md:text-5xl">
                    Drop your landing page.
                    <span className="block text-muted-foreground">We&apos;ll do the rest.</span>
                  </h1>
                  <form onSubmit={startRun} className="mt-8 flex rounded-md border bg-white p-1 shadow-sm">
                    <Input
                      value={url}
                      onChange={(event) => setUrl(event.target.value)}
                      className="h-11 border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                    <Button type="submit" className="h-11 shrink-0 px-4">
                      Read my site
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </form>
                  <RunModeToggle value={runMode} onChange={setRunMode} />
                </div>
              </div>
            </motion.div>
          </section>
        ) : (
          <section className="flex flex-1 flex-col gap-4 py-4">
            {!isDiscovery ? (
              <div className="grid gap-4">
                <div className={state.onboardingStep === "analysis" ? "hidden" : "block"}>
                  <ConnectingPanel
                    step={state.onboardingStep ?? "connecting"}
                    visibleIds={state.schemaIds}
                    sections={liveSchemaSections}
                  />
                </div>
                <motion.div
                  initial={false}
                  animate={{
                    opacity: state.onboardingStep === "analysis" ? 1 : 0,
                    y: state.onboardingStep === "analysis" ? 0 : 12,
                    height: state.onboardingStep === "analysis" ? "auto" : 0,
                  }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <div className="rounded-xl border bg-[#fff8f3] p-6 shadow-sm">
                    <WebsitePreviewFrame
                      activeSection={state.activeWebsiteSection}
                      scroll={state.websiteScroll}
                      locked={gate !== "profile"}
                    />
                  </div>
                  <div className="mt-4">
                    <SchemaStreamPanel visibleIds={state.schemaIds} sections={liveSchemaSections} compact />
                  </div>
                  {gate === "profile" && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm md:flex-row md:items-center md:justify-between"
                    >
                      <div>
                        <div className="text-sm font-semibold">Website analysis complete</div>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                          Review the inferred GTM profile, then approve it to start finding opportunities.
                        </p>
                      </div>
                      <Button onClick={proceed} className="shrink-0">
                        Approve profile and find opportunities
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  )}
                </motion.div>
              </div>
            ) : state.phase === "discovery" ? (
              <ResearchBoard
                searches={state.searches}
                activeStage={state.activeStage}
                activeMessage={state.activeMessage}
                ready={gate === "research"}
                showSeededStrategy={runMode === "dry"}
                opportunityCount={opportunityCount}
                sourceResults={liveSourceResults}
              />
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="grid gap-4"
              >
                <OpportunityFeed
                  visibleIds={state.opportunityIds}
                  selectedId={state.selectedOpportunityId}
                  rewriteVariant={state.rewriteVariant}
                  approvalState={state.approvalState}
                  items={liveOpportunities}
                />
                <ResearchInsights searches={state.searches} showSeededStrategy={runMode === "dry"} />
                {runMode === "dry" && <MonitoringSummary complete={state.phase === "complete"} />}
              </motion.div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}

function ResearchBoard({
  searches,
  activeStage,
  activeMessage,
  ready,
  showSeededStrategy,
  opportunityCount,
  sourceResults = [],
}: {
  searches: Array<{ source: "reddit" | "x" | "hacker_news" | "github" | "web" | "resend"; query: string }>;
  activeStage: string;
  activeMessage: string;
  ready: boolean;
  showSeededStrategy: boolean;
  opportunityCount: number;
  sourceResults?: SourceReference[];
}) {
  const groups = groupedSearches(searches);
  const totalQueries = groups.reduce((count, group) => count + group.keywords.length, 0);
  const usefulCount = ready ? opportunityCount : Math.min(opportunityCount, Math.max(1, groups.length));
  const sourceMetric = showSeededStrategy ? groups.length : Math.max(groups.length, sourceResults.length);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-xl border bg-white/80 p-5 shadow-sm backdrop-blur"
    >
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <h2 className="text-3xl font-semibold tracking-normal">{activeStage}</h2>
          <p className="mt-2 text-base leading-7 text-muted-foreground">{activeMessage}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <ResearchMetric label="Sources" value={sourceMetric} />
          <ResearchMetric label="Queries" value={totalQueries} />
          <ResearchMetric label="Useful" value={usefulCount} />
          <ResearchMetric label="Skipped" value={showSeededStrategy && ready ? skippedOpportunities.length : "..."} />
        </div>
      </div>

      {showSeededStrategy && <SearchStrategyCard />}

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <AnimatePresence initial={false}>
          {showSeededStrategy ? groups.map((group, index) => (
            <motion.div
              key={group.source}
              layout
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: index * 0.04, duration: 0.28 }}
              className="min-h-[220px] rounded-lg border bg-card p-4 shadow-sm"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                    <SourceIcon source={group.source} className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{sourceLabel(group.source)}</div>
                    <div className="text-xs text-muted-foreground">
                      {ready ? "Search complete" : "Searching relevant conversations"}
                    </div>
                  </div>
                </div>
                {ready ? (
                  <CheckCircle2 className="h-4 w-4 text-primary-foreground" />
                ) : (
                  <Loader2 className="h-4 w-4 animate-spin text-primary-foreground" />
                )}
              </div>
              <div className="space-y-2">
                {group.keywords.map((keyword) => (
                  <motion.div
                    key={keyword}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="rounded-md border bg-background px-3 py-2 text-sm font-medium leading-5"
                  >
                    {keyword}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )) : sourceResults.map((source, index) => (
            <motion.a
              key={source.url}
              href={source.url}
              target="_blank"
              rel="noreferrer"
              layout
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: index * 0.04, duration: 0.28 }}
              className="min-h-[220px] rounded-lg border bg-card p-4 shadow-sm transition hover:shadow-md"
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted">
                  <SourceIcon source={source.source} className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{sourceLabel(source.source)}</div>
                  <div className="truncate text-xs text-muted-foreground">{hostnameForDisplay(source.url)}</div>
                </div>
              </div>
              <h3 className="line-clamp-2 text-base font-semibold tracking-normal">{source.title}</h3>
              <p className="mt-3 line-clamp-5 text-sm leading-6 text-muted-foreground">
                {source.snippet || source.fetchedContent || "Fetched source content for live opportunity research."}
              </p>
            </motion.a>
          ))}
        </AnimatePresence>
        {(showSeededStrategy ? groups.length : sourceResults.length) < 5 &&
          Array.from({ length: 5 - (showSeededStrategy ? groups.length : sourceResults.length) }).map((_, index) => (
            <div
              key={index}
              className="min-h-[220px] rounded-lg border border-dashed bg-card/45 p-4 opacity-60"
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-md bg-muted" />
                <div className="space-y-2">
                  <div className="h-3 w-24 rounded-full bg-muted" />
                  <div className="h-2.5 w-36 rounded-full bg-muted" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-9 rounded-md bg-muted/70" />
                <div className="h-9 rounded-md bg-muted/50" />
                <div className="h-9 rounded-md bg-muted/30" />
              </div>
            </div>
          ))}
      </div>

      <AnimatePresence initial={false}>
        {showSeededStrategy && ready && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 rounded-lg border bg-card p-4 shadow-sm"
          >
            <div className="mb-3 flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-semibold text-muted-foreground">Quality filter</div>
                <h3 className="mt-1 text-base font-semibold tracking-normal">Skipped opportunities</h3>
              </div>
              <Badge variant="secondary">{skippedOpportunities.length} skipped</Badge>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {skippedOpportunities.map((item) => (
                <div key={item.title} className="rounded-md border bg-background p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">{item.source}</span>
                    <Badge variant="outline">Skipped</Badge>
                  </div>
                  <div className="text-sm font-semibold">{item.title}</div>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">{item.reason}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ResearchInsights({
  searches,
  showSeededStrategy,
}: {
  searches: Array<{ source: "reddit" | "x" | "hacker_news" | "github" | "web" | "resend"; query: string }>;
  showSeededStrategy: boolean;
}) {
  const [open, setOpen] = useState(false);
  const groups = groupedSearches(searches);
  const totalQueries = groups.reduce((count, group) => count + group.keywords.length, 0);

  return (
    <div className="rounded-lg border bg-card shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full cursor-pointer flex-col gap-3 p-4 text-left md:flex-row md:items-center md:justify-between"
      >
        <div>
          <div className="text-xs font-semibold text-muted-foreground">Research insights</div>
          <h2 className="mt-1 text-base font-semibold tracking-normal">Search strategy, queries, and filtered results</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            View the source audit trail behind this opportunity queue.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <ResearchMetric label="Sources" value={groups.length} />
          <ResearchMetric label="Queries" value={totalQueries} />
          <ResearchMetric label="Filtered" value={showSeededStrategy ? skippedOpportunities.length : "..."} />
          <ChevronDown
            className={`h-5 w-5 text-muted-foreground transition ${open ? "rotate-180" : ""}`}
          />
        </div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t"
          >
            <div className="space-y-4 p-4">
              {showSeededStrategy && <SearchStrategyCard compact />}
              <SearchQueryDetails groups={groups} />
              {showSeededStrategy && <SkippedOpportunityDetails />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SearchQueryDetails({ groups }: { groups: Array<{ source: "reddit" | "x" | "hacker_news" | "github" | "web" | "resend"; keywords: string[] }> }) {
  return (
    <div className="rounded-lg border bg-background p-4">
      <div className="mb-3">
        <div className="text-xs font-semibold text-muted-foreground">Exact queries</div>
        <h3 className="mt-1 text-base font-semibold tracking-normal">What the agent searched</h3>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {groups.map((group) => (
          <div key={group.source} className="rounded-md border bg-card p-3">
            <div className="mb-3 flex items-center gap-2">
              <SourceIcon source={group.source} className="h-4 w-4" />
              <span className="text-sm font-semibold">{sourceLabel(group.source)}</span>
            </div>
            <div className="space-y-2">
              {group.keywords.map((keyword) => (
                <div key={keyword} className="rounded-md border bg-background px-3 py-2 text-xs leading-5 text-muted-foreground">
                  {keyword}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SkippedOpportunityDetails() {
  return (
    <div className="rounded-lg border bg-background p-4">
      <div className="mb-3 flex items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-muted-foreground">Quality filter</div>
          <h3 className="mt-1 text-base font-semibold tracking-normal">Why results were skipped</h3>
        </div>
        <Badge variant="secondary">{skippedOpportunities.length} skipped</Badge>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {skippedOpportunities.map((item) => (
          <div key={item.title} className="rounded-md border bg-card p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-muted-foreground">{item.source}</span>
              <Badge variant="outline">Skipped</Badge>
            </div>
            <div className="text-sm font-semibold">{item.title}</div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">{item.reason}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SearchStrategyCard({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`rounded-lg border bg-card p-4 ${compact ? "" : "shadow-sm"}`}>
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-xs font-semibold text-muted-foreground">Search strategy</div>
          <h3 className="mt-1 text-base font-semibold tracking-normal">{searchStrategy.mode}</h3>
        </div>
        <Badge variant="outline">Review before hourly scans</Badge>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <StrategyColumn label="Channels" items={searchStrategy.channels} />
        <StrategyColumn label="Query clusters" items={searchStrategy.queryClusters} />
        <StrategyColumn label="Rules" items={searchStrategy.rules} />
      </div>
    </div>
  );
}

function StrategyColumn({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <div className="mb-2 text-xs font-semibold text-muted-foreground">{label}</div>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span key={item} className="rounded-full border bg-muted/35 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function ResearchMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="min-w-24 rounded-md border bg-background px-4 py-3 text-center">
      <div className="text-lg font-bold">{value}</div>
      <div className="text-[10px] font-medium text-muted-foreground uppercase">{label}</div>
    </div>
  );
}

function hostnameForDisplay(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function RunModeToggle({
  value,
  onChange,
}: {
  value: RunMode;
  onChange: (value: RunMode) => void;
}) {
  const options: Array<{ value: RunMode; label: string }> = [
    { value: "dry", label: "Dry run" },
    { value: "real", label: "Real mode" },
  ];

  return (
    <div className="mt-3 inline-grid grid-cols-2 rounded-md border bg-white p-1 shadow-sm">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`h-9 min-w-28 rounded-sm px-3 text-sm font-semibold transition ${
            value === option.value
              ? "bg-[#1f2b24] text-white shadow-sm"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function ConnectingPanel({
  step,
  visibleIds,
  sections,
}: {
  step: "connecting" | "trust" | "content" | "analysis";
  visibleIds: string[];
  sections?: typeof schemaSections;
}) {
  const activeSections = sections?.length ? sections : schemaSections;
  const steps = [
    { id: "connecting", label: activeSections[0]?.label ?? "Product summary" },
    { id: "trust", label: activeSections[1]?.label ?? "Target customer" },
    { id: "content", label: activeSections[2]?.label ?? "Pain points" },
  ] as const;
  const activeIndex = Math.max(0, steps.findIndex((item) => item.id === step));

  return (
    <div className="col-span-full rounded-xl border bg-[#fff8f3] p-8 shadow-sm">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto w-full max-w-7xl"
      >
        <div className="grid min-h-[600px] items-center gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="overflow-hidden rounded-lg border border-[#e8ded7] bg-[#fdfaf5] shadow-md">
            <div className="flex h-11 items-center gap-3 border-b bg-[#f6f0ea] px-4">
              <div className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#ff6b5f]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#f3bf4f]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#5ecf81]" />
              </div>
              <div className="flex min-w-0 flex-1 items-center justify-center rounded-md bg-white px-3 py-1.5 text-[11px] text-muted-foreground shadow-sm">
                salonagent.ai
              </div>
            </div>
            <div className="grid h-[560px] place-items-center bg-[#fffaf4] px-10 text-center">
              <div>
                <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm">
                  <Radar className="h-6 w-6 text-[#2e8b64]" />
                </div>
                <h2 className="text-3xl font-semibold tracking-normal">salonagent.ai</h2>
                <p className="mt-2 text-xs text-muted-foreground">
                  {step === "connecting" && "Connecting to salonagent.ai"}
                  {step === "trust" && "Checking trust signals"}
                  {step === "content" && "Preparing content for analysis"}
                </p>
              </div>
            </div>
          </div>

          <div className="relative w-full max-w-[360px] justify-self-center">
            <p className="mb-6 text-pretty text-sm leading-6 text-[#6e5a55] italic">
              &ldquo;Most salons don&apos;t lose clients. They just couldn&apos;t answer the phone.&rdquo;
            </p>
            <div className="space-y-5">
              {steps.map((item, index) => {
                const active = index === activeIndex;
                const done = index < activeIndex;

                return (
                  <div key={item.id} className="grid min-h-[88px] grid-cols-[40px_minmax(0,1fr)] gap-4">
                    <div className="flex h-full flex-col items-center">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-[#fff8f3] ${
                          active
                            ? "border-primary bg-primary text-primary-foreground"
                            : done
                              ? "border-primary bg-primary/20 text-primary-foreground"
                              : "border-border text-muted-foreground"
                        }`}
                      >
                        {done ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : active ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <span className="h-3 w-3 rounded-full bg-current" />
                        )}
                      </div>
                      {index < steps.length - 1 && (
                        <div className="mt-2 min-h-8 w-px flex-1 bg-border" />
                      )}
                    </div>
                    <div className="min-w-0 pt-2">
                      <div className="text-[11px] font-bold tracking-[0.08em] text-foreground uppercase">
                        {item.label}
                      </div>
                      {active && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-1 text-xs text-muted-foreground"
                        >
                          {step === "content"
                            ? "Synthesizing page content into GTM context..."
                            : "Preparing the next step..."}
                        </motion.div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mx-auto mt-6 max-w-7xl">
          <SchemaStreamPanel visibleIds={visibleIds} sections={sections} compact />
        </div>
      </motion.div>
    </div>
  );
}

function RunControls({
  gate,
  progress,
  onProceed,
  onRestart,
}: {
  gate: "profile" | "research" | null;
  progress: number;
  onProceed: () => void;
  onRestart: () => void;
}) {
  const proceedLabel = gate === "profile" ? "Proceed to research" : "Rank opportunities";

  return (
    <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
      <div className="hidden w-full max-w-xs items-center gap-3 sm:flex">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full rounded-full bg-primary"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.25 }}
          />
        </div>
        <div className="w-10 text-right text-xs font-semibold">{progress}%</div>
      </div>
      {gate && (
        <Button size="sm" onClick={onProceed}>
          {proceedLabel}
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      )}
      <Button variant="outline" size="sm" onClick={onRestart}>
        <RefreshCcw className="h-3.5 w-3.5" />
        Replay
      </Button>
    </div>
  );
}

function MonitoringSummary({ complete }: { complete: boolean }) {
  const [activated, setActivated] = useState(false);
  const productSummary = schemaSections.find((section) => section.id === "summary");
  const targetCustomer = schemaSections.find((section) => section.id === "customer");
  const painPoints = schemaSections.find((section) => section.id === "pain");

  return (
    <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
      <div className="grid gap-4 border-b bg-[#fffaf7] p-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border bg-[#1f2b24] text-primary shadow-sm">
            <Scissors className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-xs font-semibold text-muted-foreground">Recurring agent</div>
              <Badge variant="outline" className="gap-1">
                <Globe2 className="h-3 w-3" />
                {demoUrl.replace("https://", "").replace(/\/$/, "")}
              </Badge>
            </div>
            <div className="mt-1 text-xl font-semibold tracking-normal">Hourly approval loop for Salon Agent</div>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              {productSummary?.answer}
            </p>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
          <SiteSignal
            icon={<Users className="h-4 w-4" />}
            label="Audience"
            value={targetCustomer?.suggestions.join(", ") ?? "Salon operators"}
          />
          <SiteSignal
            icon={<Target className="h-4 w-4" />}
            label="Pain"
            value={painPoints?.suggestions.slice(0, 2).join(", ") ?? "Missed calls"}
          />
          <SiteSignal
            icon={<Radar className="h-4 w-4" />}
            label="Scan"
            value={`${searchStrategy.channels.length} sources, ${searchStrategy.queryClusters.length} query clusters`}
          />
        </div>
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-3">
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-md border bg-background p-3">
              <span className="flex items-center gap-2">
                <Clock3 className="h-4 w-4" />
                Next scan
              </span>
              <span className="font-semibold">1 hour</span>
            </div>
            <div className="flex items-center justify-between rounded-md border bg-background p-3">
              <span className="flex items-center gap-2">
                <SimpleIcon slug="resend" className="h-4 w-4" />
                Approval email
              </span>
              <span className="font-semibold">{complete ? "Prepared" : "Pending"}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <SourcePill source="reddit" />
            <SourcePill source="x" />
            <SourcePill source="hacker_news" />
            <SourcePill source="github" />
            <SourcePill source="web" />
          </div>

          {complete && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-md border border-primary/40 bg-primary/20 p-3 text-sm leading-6"
            >
              <div className="mb-1 flex items-center gap-2 font-semibold">
                <CheckCircle2 className="h-4 w-4" />
                {opportunities.length} items ready for approval
              </div>
              Resend will email the founder with the highest-fit opportunities and link back here.
            </motion.div>
          )}
        </div>

        <div className="flex flex-col justify-between gap-3 rounded-lg border bg-background p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Founder approval email</div>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Clean summary, source links, drafts, and one-click review back into this queue.
              </p>
            </div>
            <Mail className="h-5 w-5 shrink-0 text-primary-foreground" />
          </div>
          <div className="grid gap-2">
            <Button variant="outline">
              View email preview
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button onClick={() => setActivated(true)}>
              {activated ? <CheckCircle2 className="h-4 w-4" /> : <BellRing className="h-4 w-4" />}
              {activated ? "Hourly monitoring on" : "Turn on hourly monitoring"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SiteSignal({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-md border bg-white/75 p-3">
      <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="line-clamp-2 text-sm font-semibold leading-5">{value}</div>
    </div>
  );
}

function SourcePill({ source }: { source: "reddit" | "x" | "hacker_news" | "github" | "web" }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1.5 text-xs font-semibold">
      <SourceIcon source={source} className="h-3.5 w-3.5" />
      {sourceLabel(source)}
    </span>
  );
}
