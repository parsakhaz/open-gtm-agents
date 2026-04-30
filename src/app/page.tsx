"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Globe2,
  Loader2,
  Mail,
  Play,
  Radar,
  RefreshCcw,
  Sparkles,
} from "lucide-react";
import { FormEvent, useState } from "react";
import { SimpleIcon } from "@/components/brand/simple-icon";
import { ActivityTimeline } from "@/components/dry-run/activity-timeline";
import { OpportunityFeed } from "@/components/dry-run/opportunity-feed";
import { SchemaStreamPanel } from "@/components/dry-run/schema-stream-panel";
import { WebsitePreviewFrame } from "@/components/dry-run/website-preview-frame";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { demoUrl } from "@/lib/dry-run/demo-data";
import { useDryRun } from "@/lib/dry-run/use-dry-run";

export default function Home() {
  const [url, setUrl] = useState(demoUrl);
  const [isRunning, setIsRunning] = useState(false);
  const { state, progress } = useDryRun(isRunning);

  function startRun(event?: FormEvent) {
    event?.preventDefault();
    setIsRunning(false);
    window.setTimeout(() => setIsRunning(true), 20);
  }

  const isDiscovery = state.phase === "discovery" || state.phase === "complete";

  return (
    <main className="min-h-screen bg-[#fbf2ee] text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-[1480px] flex-col px-5 py-5">
        <header className="flex items-center justify-between rounded-lg border bg-white/75 px-4 py-3 shadow-sm backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#1f2b24] text-primary">
              <Radar className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-bold tracking-normal">Open GTM Agents</div>
              <div className="text-xs text-muted-foreground">Dry-run demo workspace</div>
            </div>
          </div>
          <div className="hidden items-center gap-2 md:flex">
            <Badge variant="outline" className="gap-1">
              <SimpleIcon slug="github" className="h-3 w-3" />
              GitHub issues
            </Badge>
            <Badge variant="outline" className="gap-1">
              <SimpleIcon slug="reddit" className="h-3 w-3" />
              Reddit
            </Badge>
            <Badge variant="outline" className="gap-1">
              <SimpleIcon slug="x" className="h-3 w-3" />X / web
            </Badge>
          </div>
        </header>

        {!isRunning ? (
          <section className="grid flex-1 place-items-center py-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="w-full max-w-7xl"
            >
              <div className="mb-3 flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-3">
                  <span className="grid h-4 w-4 grid-cols-2 gap-0.5">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <span key={index} className="rounded-full bg-muted-foreground/55" />
                    ))}
                  </span>
                  <span className="font-semibold">01 · URL drop</span>
                </div>
                <ArrowRight className="h-4 w-4 -rotate-45" />
              </div>

              <div className="overflow-hidden rounded-lg border bg-white shadow-lg">
                <div className="bg-[#1f2024] px-4 pt-3">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-2 pr-3">
                      <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
                      <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
                      <span className="h-3 w-3 rounded-full bg-[#28c840]" />
                    </div>
                    <div className="flex h-10 min-w-0 items-center gap-2 rounded-t-lg bg-[#303136] px-4 text-sm text-white">
                      <span className="h-3 w-3 rounded-full bg-white/20" />
                      Open GTM Agents
                    </div>
                    <div className="hidden h-10 min-w-0 items-center gap-2 rounded-t-lg bg-[#303136]/70 px-4 text-sm text-white/55 md:flex">
                      <span className="h-3 w-3 rounded-full bg-white/20" />
                      salonagent.ai
                    </div>
                    <div className="hidden h-10 min-w-0 items-center gap-2 rounded-t-lg bg-[#303136]/70 px-4 text-sm text-white/55 md:flex">
                      <span className="h-3 w-3 rounded-full bg-white/20" />
                      reddit · r/salonowners
                    </div>
                  </div>
                  <div className="flex h-12 items-center gap-3 border-t border-white/5">
                    <span className="h-4 w-4 rounded-full bg-white/15" />
                    <div className="flex h-8 flex-1 items-center rounded-full bg-[#2b2f31] px-4 text-sm text-white/85">
                      opengtm.app/start
                    </div>
                    <span className="h-4 w-4 rounded-full bg-white/15" />
                  </div>
                </div>

                <div className="flex min-h-[680px] flex-col bg-white">
                  <div className="flex items-center justify-between border-b px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
                        <Radar className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-semibold">Open GTM Agents</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span>Step 1 of 4</span>
                      <div className="h-1 w-36 overflow-hidden rounded-full bg-muted">
                        <div className="h-full w-1/4 rounded-full bg-primary" />
                      </div>
                    </div>
                  </div>

                  <div className="grid flex-1 place-items-center px-6">
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
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </section>
        ) : (
          <section className="flex flex-1 flex-col gap-4 py-4">
            <RunTopBar
              url={url}
              progress={progress}
              phase={state.phase}
              stage={state.activeStage}
              onRestart={() => startRun()}
            />

            <AnimatePresence mode="wait">
              {!isDiscovery ? (
                <motion.div
                  key="onboarding"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.35 }}
                  className="grid gap-4"
                >
                  {state.onboardingStep !== "analysis" ? (
                    <ConnectingPanel
                      step={state.onboardingStep ?? "connecting"}
                      visibleIds={state.schemaIds}
                    />
                  ) : (
                    <>
                      <div className="rounded-xl border bg-[#fff8f3] p-6 shadow-sm">
                        <WebsitePreviewFrame
                          activeSection={state.activeWebsiteSection}
                          scroll={state.websiteScroll}
                        />
                      </div>
                      <SchemaStreamPanel visibleIds={state.schemaIds} compact />
                    </>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="discovery"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.35 }}
                  className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]"
                >
                  <div className="space-y-4">
                    <ActivityTimeline
                      searches={state.searches}
                      activeStage={state.activeStage}
                      activeMessage={state.activeMessage}
                    />
                    <MonitoringSummary complete={state.phase === "complete"} />
                  </div>
                  <OpportunityFeed
                    visibleIds={state.opportunityIds}
                    selectedId={state.selectedOpportunityId}
                    rewriteVariant={state.rewriteVariant}
                    approvalState={state.approvalState}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        )}
      </div>
    </main>
  );
}

function ConnectingPanel({
  step,
  visibleIds,
}: {
  step: "connecting" | "trust" | "content" | "analysis";
  visibleIds: string[];
}) {
  const steps = [
    { id: "connecting", label: "Navigation" },
    { id: "trust", label: "Hero" },
    { id: "content", label: "Building your report" },
  ] as const;
  const activeIndex = Math.max(0, steps.findIndex((item) => item.id === step));

  return (
    <div className="col-span-full rounded-xl border bg-[#fff8f3] p-8 shadow-sm">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto w-full max-w-5xl"
      >
        <div className="grid min-h-[500px] items-center gap-8 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="overflow-hidden rounded-lg border border-[#e8ded7] bg-[#fdfaf5] shadow-md">
            <div className="flex h-10 items-center gap-3 border-b bg-[#f6f0ea] px-4">
              <div className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#ff6b5f]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#f3bf4f]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#5ecf81]" />
              </div>
              <div className="flex min-w-0 flex-1 items-center justify-center rounded-md bg-white px-3 py-1.5 text-[11px] text-muted-foreground shadow-sm">
                salonagent.ai
              </div>
            </div>
            <div className="grid h-[320px] place-items-center bg-[#fffaf4] px-10 text-center">
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

          <div className="relative">
            <p className="mb-6 text-sm leading-6 text-[#6e5a55] italic">
              &ldquo;Most salons don&apos;t lose clients. They just couldn&apos;t answer the phone.&rdquo;
            </p>
            <div className="absolute top-14 bottom-0 left-[11px] w-px bg-border" />
            <div className="space-y-5">
              {steps.map((item, index) => {
                const active = index === activeIndex;
                const done = index < activeIndex;

                return (
                  <div key={item.id} className="relative flex gap-3">
                    <div
                      className={`z-10 flex h-6 w-6 items-center justify-center rounded-full border bg-[#fff8f3] ${
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : done
                            ? "border-primary bg-primary/20 text-primary-foreground"
                            : "border-border text-muted-foreground"
                      }`}
                    >
                      {done ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : active ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <span className="h-2 w-2 rounded-full bg-current" />
                      )}
                    </div>
                    <div>
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

        <div className="mx-auto mt-6 max-w-5xl">
          <SchemaStreamPanel visibleIds={visibleIds} compact />
        </div>
      </motion.div>
    </div>
  );
}

function RunTopBar({
  url,
  progress,
  phase,
  stage,
  onRestart,
}: {
  url: string;
  progress: number;
  phase: string;
  stage: string;
  onRestart: () => void;
}) {
  return (
    <div className="rounded-lg border bg-white/80 p-4 shadow-sm backdrop-blur">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge variant="success" className="gap-1">
              <Sparkles className="h-3 w-3" />
              Running
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Globe2 className="h-3 w-3" />
              {url}
            </Badge>
          </div>
          <h2 className="text-xl font-semibold tracking-normal">{stage}</h2>
        </div>
        <div className="flex min-w-[320px] items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full rounded-full bg-primary"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.25 }}
            />
          </div>
          <div className="w-10 text-right text-xs font-semibold">{progress}%</div>
          <Button variant="outline" size="sm" onClick={onRestart}>
            <RefreshCcw className="h-3.5 w-3.5" />
            Replay
          </Button>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {["onboarding", "discovery", "complete"].map((item) => (
          <Badge key={item} variant={phase === item ? "default" : "secondary"}>
            {item}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function MonitoringSummary({ complete }: { complete: boolean }) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold text-muted-foreground">Recurring agent</div>
          <div className="mt-1 text-sm font-semibold">Hourly approval loop</div>
        </div>
        <Mail className="h-5 w-5 text-primary-foreground" />
      </div>
      <div className="space-y-3 text-sm">
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
      {complete && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 rounded-md border border-primary/40 bg-primary/20 p-3 text-sm leading-6"
        >
          <div className="mb-1 flex items-center gap-2 font-semibold">
            <CheckCircle2 className="h-4 w-4" />
            5 items ready for approval
          </div>
          Resend will email the founder with the highest-fit opportunities and link back here.
        </motion.div>
      )}
      <Button variant="outline" className="mt-4 w-full">
        View email preview
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
