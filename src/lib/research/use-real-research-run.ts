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
            await applyEvent(JSON.parse(line) as ResearchRunEvent);
          }
        }

        if (buffer.trim()) {
          await applyEvent(JSON.parse(buffer) as ResearchRunEvent);
        }
      } catch (caught) {
        if (abortController.signal.aborted) return;
        const message =
          caught instanceof Error ? caught.message : "Live research failed.";
        setError(message);
        setState((current) => ({
          ...current,
          activeStage: "Research failed",
          activeMessage: message,
        }));
      }
    }

    async function applyEvent(event: ResearchRunEvent) {
      if (event.type === "status") {
        if (event.stage === "Inferring GTM profile") {
          setState((current) => ({
            ...current,
            phase: "onboarding",
            onboardingStep: "analysis",
            activeWebsiteSection: "navigation",
            websiteScroll: 8,
            activeStage: event.stage,
            activeMessage: event.message,
          }));
          setProgress((current) => Math.max(current, 18));
          return;
        }

        if (event.stage === "Generating search angles") {
          setState((current) => ({
            ...current,
            onboardingStep: "analysis",
            activeStage: "Website analysis complete",
            activeMessage: "Review the live GTM profile, then approve it to start source research.",
          }));
          setProgress((current) => Math.max(current, 34));
          await waitForProceed("profile");
        }

        if (event.stage === "Ranking opportunities") {
          setState((current) => ({
            ...current,
            phase: "discovery",
            activeStage: "Research ready",
            activeMessage: "Review the live search strategy and fetched sources, then continue to rank opportunities.",
          }));
          setProgress((current) => Math.max(current, 64));
          await waitForProceed("research");
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
        if (event.stage === "Researching conversations") {
          revealSourcesRef.current = true;
        }
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
          activeWebsiteSection: liveWebsiteSectionFor(current.schemaIds.length),
          websiteScroll: liveWebsiteScrollFor(current.schemaIds.length),
          schemaIds: current.schemaIds.includes(section.id)
            ? current.schemaIds
            : [...current.schemaIds, section.id],
          activeStage: "Inferring GTM profile",
        }));
        setProgress((current) => Math.max(current, 28));
        await sleep(750);
        return;
      }

      if (event.type === "source_search") {
        await sleep(220);
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
          await sleep(300);
          setSourceResults((current) =>
            current.some((item) => item.url === event.source.url)
              ? current
              : [...current, event.source],
          );
        }
        return;
      }

      if (event.type === "opportunity") {
        await sleep(450);
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
        setError(event.message);
        setState((current) => ({
          ...current,
          activeStage: "Research failed",
          activeMessage: event.message,
        }));
      }
    }

    async function waitForProceed(nextGate: "profile" | "research") {
      if (cancelled) return;
      setGate(nextGate);
      await new Promise<void>((resolve) => {
        proceedRef.current = resolve;
      });
    }

    void run();

    return () => {
      cancelled = true;
      abortController.abort();
      proceedRef.current?.();
      proceedRef.current = null;
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
