"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { OpportunityCard, SchemaSection, VisibleState } from "@/lib/dry-run/types";
import type {
  ResearchRunEvent,
  ResearchRunRequest,
  SourceReference,
} from "@/lib/research/types";
import {
  profileFieldToSchemaSection,
  researchOpportunityToCard,
} from "@/lib/research/ui-adapters";

type UseRealResearchRunInput = {
  url: string;
  isRunning: boolean;
};

const initialState: VisibleState = {
  phase: "idle",
  onboardingStep: "connecting",
  activeStage: "Ready",
  activeMessage: "Enter a URL to start the GTM agent.",
  activeWebsiteSection: "navigation",
  websiteScroll: 0,
  schemaIds: [],
  searches: [],
  opportunityIds: [],
  approvalState: "idle",
};

const liveWebsiteSections = [
  "navigation",
  "hero",
  "how-it-works",
  "social-proof",
  "stats",
  "footer",
];

type QueuedResearchEvent = {
  event: ResearchRunEvent;
  receivedAt: number;
};

type PendingStage =
  | "connecting"
  | "reading"
  | "profile"
  | "research"
  | "opportunities"
  | "done"
  | "error";

const pendingMessages: Record<Exclude<PendingStage, "done" | "error">, string> = {
  connecting: "Starting live research.",
  reading: "Opening the page and preparing content for analysis.",
  profile: "Reading the page and building GTM context.",
  research: "Searching for source-backed conversations.",
  opportunities: "Ranking the best live opportunities.",
};

const sourceRevealDelayMs = 420;
const searchRevealDelayMs = 260;
const profileStepDelayMs = 3500;
const opportunityRevealDelayMs = 520;
const pendingTickMs = profileStepDelayMs;

export function useRealResearchRun({ url, isRunning }: UseRealResearchRunInput) {
  const [state, setState] = useState<VisibleState>(initialState);
  const [progress, setProgress] = useState(0);
  const [schemaSections, setSchemaSections] = useState<SchemaSection[]>([]);
  const [opportunities, setOpportunities] = useState<OpportunityCard[]>([]);
  const [sourceResults, setSourceResults] = useState<SourceReference[]>([]);
  const sourcesRef = useRef<SourceReference[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [gate, setGate] = useState<"profile" | "research" | null>(null);
  const proceedRef = useRef<(() => void) | null>(null);
  const revealSourcesRef = useRef(false);

  const proceed = useCallback(() => {
    proceedRef.current?.();
    proceedRef.current = null;
    setGate(null);
  }, []);

  useEffect(() => {
    if (!isRunning) return;

    const abortController = new AbortController();
    let cancelled = false;
    let streamClosed = false;
    let activeRunId: string | undefined;
    let pendingStage: PendingStage = "connecting";
    let pendingIndex = 0;
    let lastPendingTick = 0;
    const queue: QueuedResearchEvent[] = [];
    let wakePresenter: (() => void) | null = null;

    async function run() {
      setState({
        ...initialState,
        phase: "onboarding",
        activeStage: "Connecting",
        activeMessage: "Starting live research.",
      });
      setProgress(4);
      setSchemaSections([]);
      setOpportunities([]);
      setSourceResults([]);
      sourcesRef.current = [];
      revealSourcesRef.current = false;
      setError(null);
      setGate(null);
      proceedRef.current = null;

      try {
        void presentEvents();

        const request: ResearchRunRequest = {
          websiteUrl: url,
          mode: "live",
          objective: "opportunity_discovery",
        };
        const response = await fetch("/api/research/run", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(request),
          signal: abortController.signal,
        });

        if (!response.ok || !response.body) {
          throw new Error(`Research request failed with ${response.status}.`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          if (cancelled) return;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.trim()) continue;
            enqueueEvent(JSON.parse(line) as ResearchRunEvent);
          }
        }

        if (buffer.trim()) {
          enqueueEvent(JSON.parse(buffer) as ResearchRunEvent);
        }
        streamClosed = true;
        wakePresenter?.();
      } catch (caught) {
        if (abortController.signal.aborted) return;
        const message =
          caught instanceof Error ? caught.message : "Live research failed.";
        pendingStage = "error";
        setError(message);
        setState((current) => ({
          ...current,
          activeStage: "Research failed",
          activeMessage: message,
        }));
        clientLog("stream failed", { message });
        streamClosed = true;
        wakePresenter?.();
      }
    }

    function enqueueEvent(event: ResearchRunEvent) {
      activeRunId = event.runId ?? activeRunId;
      queue.push({ event, receivedAt: Date.now() });
      clientLog("event queued", {
        runId: activeRunId,
        type: event.type,
        queueLength: queue.length,
      });
      wakePresenter?.();
    }

    async function presentEvents() {
      while (!cancelled) {
        const queued = await nextQueuedEvent();
        if (cancelled) return;

        if (!queued) {
          if (streamClosed) return;
          tickPendingPresentation();
          continue;
        }

        await revealEvent(queued.event, queued.receivedAt);
      }
    }

    async function nextQueuedEvent() {
      if (queue.length > 0) {
        return queue.shift() ?? null;
      }

      if (streamClosed) {
        return null;
      }

      await new Promise<void>((resolve) => {
        const wake = () => {
          window.clearTimeout(timeout);
          if (wakePresenter === wake) {
            wakePresenter = null;
          }
          resolve();
        };
        const timeout = window.setTimeout(() => {
          if (wakePresenter === wake) {
            wakePresenter = null;
          }
          resolve();
        }, pendingTickMs);

        wakePresenter = wake;
      });

      return queue.shift() ?? null;
    }

    async function revealEvent(event: ResearchRunEvent, receivedAt: number) {
      clientLog("event reveal", {
        runId: activeRunId,
        type: event.type,
        queueLength: queue.length,
        latencyMs: Date.now() - receivedAt,
      });

      if (event.type === "status") {
        if (event.stage === "Reading website") {
          pendingStage = "reading";
          setState((current) => ({
            ...current,
            phase: "onboarding",
            onboardingStep: "analysis",
            activeWebsiteSection: "navigation",
            websiteScroll: 0,
            activeStage: event.stage,
            activeMessage: event.message,
          }));
          setProgress((current) => Math.max(current, 10));
          return;
        }

        if (event.stage === "Website content ready") {
          pendingStage = "profile";
          setState((current) => ({
            ...current,
            phase: "onboarding",
            onboardingStep: "analysis",
            activeWebsiteSection: liveWebsiteSectionFor(Math.max(current.schemaIds.length, 1)),
            websiteScroll: liveWebsiteScrollFor(Math.max(current.schemaIds.length, 1)),
            activeStage: event.stage,
            activeMessage: event.message,
          }));
          setProgress((current) => Math.max(current, 16));
          return;
        }

        if (event.stage === "Inferring GTM profile" || event.stage === "GTM model running") {
          pendingStage = "profile";
          setState((current) => ({
            ...current,
            phase: "onboarding",
            onboardingStep: "analysis",
            activeWebsiteSection: liveWebsiteSectionFor(Math.max(current.schemaIds.length, 1)),
            websiteScroll: liveWebsiteScrollFor(Math.max(current.schemaIds.length, 1)),
            activeStage: event.stage,
            activeMessage: event.message,
          }));
          setProgress((current) => Math.max(current, 18));
          return;
        }

        if (event.stage === "GTM profile ready") {
          pendingStage = "profile";
          setState((current) => ({
            ...current,
            phase: "onboarding",
            onboardingStep: "analysis",
            activeStage: event.stage,
            activeMessage: event.message,
          }));
          setProgress((current) => Math.max(current, 30));
          return;
        }

        if (event.stage === "Generating search angles") {
          pendingStage = "profile";
          setState((current) => ({
            ...current,
            onboardingStep: "analysis",
            activeWebsiteSection: liveWebsiteSectionFor(Math.max(current.schemaIds.length - 1, 0)),
            websiteScroll: liveWebsiteScrollFor(Math.max(current.schemaIds.length - 1, 0)),
            activeStage: "Website analysis complete",
            activeMessage: "Review the live GTM profile, then approve it to start source research.",
          }));
          setProgress((current) => Math.max(current, 34));
          await waitForProceed("profile");
          return;
        }

        if (event.stage === "Researching conversations" || event.stage === "Source search running") {
          pendingStage = "research";
          revealSourcesRef.current = true;
          setState((current) => ({
            ...current,
            phase: "discovery",
            activeStage: event.stage,
            activeMessage: event.message,
          }));
          setProgress((current) => Math.max(current, 48));
          return;
        }

        if (event.stage === "Source search complete") {
          pendingStage = "research";
          revealSourcesRef.current = true;
          setState((current) => ({
            ...current,
            phase: "discovery",
            activeStage: "Research ready",
            activeMessage: event.message,
          }));
          setProgress((current) => Math.max(current, 58));
          return;
        }

        if (event.stage === "Ranking opportunities") {
          pendingStage = "opportunities";
          setState((current) => ({
            ...current,
            phase: "discovery",
            activeStage: "Research ready",
            activeMessage: "Review the live search strategy and fetched sources, then continue to rank opportunities.",
          }));
          setProgress((current) => Math.max(current, 64));
          await waitForProceed("research");
          return;
        }

        if (event.stage === "Opportunity model running" || event.stage === "Drafting responses") {
          pendingStage = "opportunities";
          setState((current) => ({
            ...current,
            phase: current.phase,
            activeStage: event.stage,
            activeMessage: event.message,
          }));
          setProgress((current) => Math.max(current, event.stage === "Drafting responses" ? 72 : 68));
          return;
        }

        setState((current) => ({
          ...current,
          phase: current.phase === "idle" ? "onboarding" : current.phase,
          onboardingStep:
            event.stage.toLowerCase().includes("website") ||
            event.stage.toLowerCase().includes("reading")
              ? "content"
              : current.onboardingStep,
          activeStage: event.stage,
          activeMessage: event.message,
        }));
        setProgress((current) => Math.max(current, 12));
        return;
      }

      if (event.type === "profile_update") {
        const section = profileFieldToSchemaSection(event.field);
        setSchemaSections((current) =>
          current.some((item) => item.id === section.id)
            ? current.map((item) => (item.id === section.id ? section : item))
            : [...current, section],
        );
        setState((current) => ({
          ...current,
          phase: "onboarding",
          onboardingStep: "analysis",
          activeWebsiteSection: liveWebsiteSectionFor(nextSchemaIndex(current.schemaIds, section.id)),
          websiteScroll: liveWebsiteScrollFor(nextSchemaIndex(current.schemaIds, section.id)),
          schemaIds: current.schemaIds.includes(section.id)
            ? current.schemaIds
            : [...current.schemaIds, section.id],
          activeStage: "Inferring GTM profile",
        }));
        setProgress((current) => Math.max(current, 28));
        await sleep(profileStepDelayMs);
        return;
      }

      if (event.type === "source_search") {
        await sleep(searchRevealDelayMs);
        setState((current) => ({
          ...current,
          phase: "discovery",
          searches: current.searches.some(
            (item) => item.source === event.source && item.query === event.query,
          )
            ? current.searches
            : [...current.searches, { source: event.source, query: event.query }],
          activeStage: "Looking for conversations",
          activeMessage: "Searching for source-backed opportunities.",
        }));
        setProgress((current) => Math.max(current, 52));
        return;
      }

      if (event.type === "source_result") {
        const next = sourcesRef.current.some((item) => item.url === event.source.url)
          ? sourcesRef.current
          : [...sourcesRef.current, event.source];
        sourcesRef.current = next;
        if (revealSourcesRef.current) {
          await sleep(sourceRevealDelayMs);
          setSourceResults((current) =>
            current.some((item) => item.url === event.source.url)
              ? current
              : [...current, event.source],
          );
        }
        return;
      }

      if (event.type === "opportunity") {
        await sleep(opportunityRevealDelayMs);
        const card = researchOpportunityToCard(event.opportunity, sourcesRef.current);
        setOpportunities((current) =>
          current.some((item) => item.id === card.id)
            ? current.map((item) => (item.id === card.id ? card : item))
            : [...current, card],
        );
        setState((current) => ({
          ...current,
          phase: "complete",
          opportunityIds: current.opportunityIds.includes(card.id)
            ? current.opportunityIds
            : [...current.opportunityIds, card.id],
          selectedOpportunityId: current.selectedOpportunityId ?? card.id,
          approvalState: current.approvalState === "idle" ? "reviewing" : current.approvalState,
          activeStage: "Ready for review",
          activeMessage: "Live opportunities are ready for approval.",
        }));
        setProgress((current) => Math.max(current, 78));
        return;
      }

      if (event.type === "done") {
        pendingStage = "done";
        setState((current) => ({
          ...current,
          phase: "complete",
          activeStage: "Ready for review",
          activeMessage: `${event.result.opportunityCount} live opportunities ready for approval.`,
        }));
        setProgress(100);
        return;
      }

      if (event.type === "error") {
        pendingStage = "error";
        setError(event.message);
        setState((current) => ({
          ...current,
          activeStage: "Research failed",
          activeMessage: event.message,
        }));
      }
    }

    function tickPendingPresentation() {
      if (pendingStage === "done" || pendingStage === "error") return;
      const now = Date.now();
      if (now - lastPendingTick < pendingTickMs - 50) return;
      lastPendingTick = now;

      if (pendingStage === "connecting") {
        setState((current) => ({
          ...current,
          phase: "onboarding",
          onboardingStep: "connecting",
          activeStage: "Connecting",
          activeMessage: pendingMessages.connecting,
        }));
        return;
      }

      if (pendingStage === "reading") {
        setState((current) => ({
          ...current,
          phase: "onboarding",
          onboardingStep: "analysis",
          activeWebsiteSection: "navigation",
          websiteScroll: 0,
          activeStage: "Reading website",
          activeMessage: pendingMessages.reading,
        }));
        return;
      }

      if (pendingStage === "profile") {
        pendingIndex = Math.min(pendingIndex + 1, liveWebsiteSections.length - 1);
        setState((current) => {
          const visibleCount = current.schemaIds.length;
          const nextIndex = Math.max(visibleCount, pendingIndex);
          return {
            ...current,
            phase: "onboarding",
            onboardingStep: "analysis",
            activeWebsiteSection: liveWebsiteSectionFor(nextIndex),
            websiteScroll: liveWebsiteScrollFor(nextIndex),
            activeStage: "Inferring GTM profile",
            activeMessage: pendingMessages.profile,
          };
        });
        setProgress((current) => Math.max(current, Math.min(30, 18 + pendingIndex * 2)));
        clientLog("pending profile tick", { runId: activeRunId, pendingIndex, queueLength: queue.length });
        return;
      }

      if (pendingStage === "research") {
        setState((current) => ({
          ...current,
          phase: "discovery",
          activeStage: "Looking for conversations",
          activeMessage: pendingMessages.research,
        }));
        setProgress((current) => Math.max(current, 52));
        return;
      }

      if (pendingStage === "opportunities") {
        setState((current) => ({
          ...current,
          phase: current.opportunityIds.length > 0 ? "complete" : "discovery",
          activeStage: "Ranking opportunities",
          activeMessage: pendingMessages.opportunities,
        }));
        setProgress((current) => Math.max(current, 68));
      }
    }

    async function waitForProceed(nextGate: "profile" | "research") {
      if (cancelled) return;
      const startedAt = Date.now();
      setGate(nextGate);
      clientLog("gate entered", { runId: activeRunId, gate: nextGate, queueLength: queue.length });
      await new Promise<void>((resolve) => {
        proceedRef.current = resolve;
      });
      clientLog("gate exited", {
        runId: activeRunId,
        gate: nextGate,
        queueLength: queue.length,
        waitedMs: Date.now() - startedAt,
      });
    }

    void run();

    return () => {
      cancelled = true;
      abortController.abort();
      proceedRef.current?.();
      proceedRef.current = null;
      wakePresenter?.();
    };
  }, [isRunning, url]);

  return useMemo(
    () => ({
      state,
      progress,
      gate,
      proceed,
      opportunities,
      schemaSections,
      sourceResults,
      error,
    }),
    [error, gate, opportunities, proceed, progress, schemaSections, sourceResults, state],
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function liveWebsiteSectionFor(index: number) {
  return liveWebsiteSections[Math.min(index, liveWebsiteSections.length - 1)];
}

function liveWebsiteScrollFor(index: number) {
  const scrollStops = [0, 8, 28, 48, 68, 86];
  return scrollStops[Math.min(index, scrollStops.length - 1)];
}

function nextSchemaIndex(schemaIds: string[], sectionId: string) {
  return schemaIds.includes(sectionId) ? schemaIds.indexOf(sectionId) : schemaIds.length;
}

function clientLog(message: string, data?: Record<string, unknown>) {
  if (process.env.NODE_ENV === "production") return;
  const suffix = data ? ` ${safeJson(data)}` : "";
  console.log(`[real-research-ui] ${message}${suffix}`);
}

function safeJson(data: Record<string, unknown>) {
  try {
    return JSON.stringify(data);
  } catch {
    return "";
  }
}
