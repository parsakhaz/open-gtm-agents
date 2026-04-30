"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Bell,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Eye,
  Globe2,
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
          <section className="grid flex-1 place-items-center py-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="w-full max-w-4xl"
            >
              <div className="mb-8 text-center">
                <Badge variant="success" className="mb-4 gap-1">
                  <Sparkles className="h-3 w-3" />
                  Agent-native GTM discovery
                </Badge>
                <h1 className="mx-auto max-w-3xl text-4xl leading-tight font-semibold tracking-normal text-balance md:text-5xl">
                  Turn one landing page into live GTM opportunities.
                </h1>
                <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
                  The dry run shows the agent reading a site, filling a GTM schema, searching channels,
                  and streaming approval-ready comment and post opportunities.
                </p>
              </div>

              <Card className="overflow-hidden bg-white/90 shadow-lg">
                <div className="grid gap-0 lg:grid-cols-[1fr_280px]">
                  <form onSubmit={startRun} className="p-5">
                    <label className="mb-2 block text-sm font-semibold">Product URL</label>
                    <div className="flex gap-2">
                      <Input value={url} onChange={(event) => setUrl(event.target.value)} />
                      <Button type="submit" className="shrink-0">
                        <Play className="h-4 w-4" />
                        Run
                      </Button>
                    </div>
                    <div className="mt-5 grid gap-3 md:grid-cols-3">
                      <ValuePill icon={<Eye className="h-4 w-4" />} title="Watch the site" text="A simulated browser scrolls through the page." />
                      <ValuePill icon={<Sparkles className="h-4 w-4" />} title="Stream context" text="Answers appear as the agent finds evidence." />
                      <ValuePill icon={<Bell className="h-4 w-4" />} title="Approve replies" text="Cards arrive with drafts ready to review." />
                    </div>
                  </form>
                  <div className="border-t bg-[#f7efe9] p-5 lg:border-t-0 lg:border-l">
                    <div className="text-xs font-semibold text-muted-foreground">Demo script</div>
                    <div className="mt-3 space-y-3">
                      {["Analyze website", "Build GTM profile", "Search source graph", "Draft opportunities"].map((item, index) => (
                        <div key={item} className="flex items-center gap-3 text-sm">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-semibold shadow-sm">
                            {index + 1}
                          </div>
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
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
                  className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_430px]"
                >
                  {state.onboardingStep !== "analysis" ? (
                    <ConnectingPanel step={state.onboardingStep ?? "connecting"} url={url} />
                  ) : (
                    <>
                      <div className="rounded-xl border bg-[#fff8f3] p-6 shadow-sm">
                        <WebsitePreviewFrame
                          activeSection={state.activeWebsiteSection}
                          scroll={state.websiteScroll}
                        />
                      </div>
                      <SchemaStreamPanel visibleIds={state.schemaIds} />
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
  url,
}: {
  step: "connecting" | "trust" | "content" | "analysis";
  url: string;
}) {
  const steps = [
    { id: "connecting", label: "URL clarity", icon: Globe2 },
    { id: "trust", label: "Trust signals", icon: ShieldIcon },
    { id: "content", label: "Content", icon: FileCheck2 },
  ] as const;
  const activeIndex = Math.max(0, steps.findIndex((item) => item.id === step));

  return (
    <div className="col-span-full grid min-h-[650px] place-items-center rounded-xl border bg-[#fff8f3] p-8 shadow-sm">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl text-center"
      >
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm">
          <Radar className="h-8 w-8 text-[#2e8b64]" />
        </div>
        <h2 className="text-4xl font-semibold tracking-normal">salonagent.ai</h2>
        <p className="mt-2 text-sm text-muted-foreground">Connecting to {url.replace(/^https?:\/\//, "")}</p>

        <div className="mx-auto mt-9 grid max-w-xl grid-cols-3 gap-4">
          {steps.map((item, index) => {
            const Icon = item.icon;
            const active = index === activeIndex;
            const done = index < activeIndex;

            return (
              <motion.div
                key={item.id}
                animate={{
                  opacity: active || done ? 1 : 0.35,
                  scale: active ? 1.04 : 1,
                }}
                className={`rounded-xl border bg-white p-4 shadow-sm ${active ? "border-[#d66b61]" : ""}`}
              >
                <div
                  className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full ${
                    done ? "bg-primary text-primary-foreground" : active ? "bg-[#fff0eb] text-[#b24b42]" : "bg-muted"
                  }`}
                >
                  {done ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <div className="mt-3 text-xs font-semibold">{item.label}</div>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          key={step}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-9 text-sm text-muted-foreground"
        >
          {step === "connecting" && "Opening the landing page and preparing a desktop preview."}
          {step === "trust" && "Checking source quality, redirects, and visible business context."}
          {step === "content" && "Loading page content before the agent starts reading sections."}
        </motion.div>
      </motion.div>
    </div>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return <CheckCircle2 className={className} />;
}

function ValuePill({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
        {icon}
        {title}
      </div>
      <p className="text-xs leading-5 text-muted-foreground">{text}</p>
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
