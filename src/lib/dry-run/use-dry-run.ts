"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { dryRunEvents } from "./demo-data";
import type { DryRunEvent, VisibleState } from "./types";

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

const totalDuration = dryRunEvents.at(-1)?.at ?? 35600;

export function useDryRun(isRunning: boolean) {
  const [state, setState] = useState<VisibleState>(initialState);
  const [timelineAt, setTimelineAt] = useState(0);
  const [gate, setGate] = useState<"profile" | "research" | null>(null);
  const proceedRef = useRef<(() => void) | null>(null);

  const proceed = useCallback(() => {
    proceedRef.current?.();
    proceedRef.current = null;
    setGate(null);
  }, []);

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    let cancelled = false;
    proceedRef.current = null;

    async function runTimeline() {
      setState(initialState);
      setTimelineAt(0);
      setGate(null);

      let previousAt = 0;

      for (const event of dryRunEvents) {
        await sleep(event.at - previousAt);
        if (cancelled) return;

        previousAt = event.at;
        setTimelineAt(event.at);

        if (event.type === "gate") {
          setGate(event.gate);
          await new Promise<void>((resolve) => {
            proceedRef.current = resolve;
          });
          if (cancelled) return;
          continue;
        }

        setState((current) => applyEvent(current, event));
      }
    }

    void runTimeline();

    return () => {
      cancelled = true;
      proceedRef.current?.();
      proceedRef.current = null;
    };
  }, [isRunning]);

  const progress = isRunning ? Math.min(100, Math.round((timelineAt / totalDuration) * 100)) : 0;

  return { state, progress, gate, proceed };
}

function applyEvent(current: VisibleState, event: Exclude<DryRunEvent, { type: "gate" }>) {
  if (event.type === "phase") {
    return { ...current, phase: event.phase };
  }

  if (event.type === "status") {
    return {
      ...current,
      activeStage: event.stage,
      activeMessage: event.message,
    };
  }

  if (event.type === "onboarding_step") {
    return {
      ...current,
      onboardingStep: event.step,
    };
  }

  if (event.type === "website_focus") {
    return {
      ...current,
      activeWebsiteSection: event.sectionId,
      websiteScroll: event.scrollTo,
    };
  }

  if (event.type === "schema_answer") {
    return current.schemaIds.includes(event.sectionId)
      ? current
      : { ...current, schemaIds: [...current.schemaIds, event.sectionId] };
  }

  if (event.type === "source_search") {
    return {
      ...current,
      searches: [...current.searches, { source: event.source, query: event.query }],
    };
  }

  if (event.type === "opportunity") {
    const nextOpportunityIds = current.opportunityIds.includes(event.cardId)
      ? current.opportunityIds
      : [...current.opportunityIds, event.cardId];

    return current.opportunityIds.includes(event.cardId)
      ? current
      : {
          ...current,
          opportunityIds: nextOpportunityIds,
          selectedOpportunityId: current.selectedOpportunityId ?? event.cardId,
          approvalState: current.approvalState === "idle" ? "reviewing" : current.approvalState,
        };
  }

  return current;
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, Math.max(0, ms)));
}
