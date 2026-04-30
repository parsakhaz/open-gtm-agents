"use client";

import { useEffect, useMemo, useState } from "react";
import { dryRunEvents } from "./demo-data";
import type { VisibleState } from "./types";

const initialState: VisibleState = {
  phase: "idle",
  activeStage: "Ready",
  activeMessage: "Enter a URL to start the GTM agent.",
  activeWebsiteSection: "navigation",
  websiteScroll: 0,
  schemaIds: [],
  searches: [],
  opportunityIds: [],
  approvalState: "idle",
};

export function useDryRun(isRunning: boolean) {
  const [state, setState] = useState<VisibleState>(initialState);
  const [startedAt, setStartedAt] = useState<number | null>(null);

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const nextStartedAt = Date.now();
    window.setTimeout(() => {
      setState(initialState);
      setStartedAt(nextStartedAt);
    }, 0);

    const timers = dryRunEvents.map((event) =>
      window.setTimeout(() => {
        setState((current) => {
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
        });
      }, event.at),
    );

    const interactionTimers = [
      window.setTimeout(() => {
        setState((current) => ({
          ...current,
          selectedOpportunityId: "reddit-missed-calls",
          approvalState: "reviewing",
        }));
      }, 19000),
      window.setTimeout(() => {
        setState((current) => ({
          ...current,
          rewriteVariant: "softer",
          approvalState: "rewriting",
          activeStage: "Refining draft",
          activeMessage: "The founder chooses a softer version before copying the reply.",
        }));
      }, 20400),
      window.setTimeout(() => {
        setState((current) => ({
          ...current,
          approvalState: "copied",
          activeStage: "Draft copied",
          activeMessage: "The first reply is ready to paste manually into the original thread.",
        }));
      }, 22200),
      window.setTimeout(() => {
        setState((current) => ({
          ...current,
          selectedOpportunityId: "x-ai-receptionist",
          rewriteVariant: undefined,
          approvalState: "reviewing",
          activeStage: "Streaming next matches",
          activeMessage: "The agent keeps searching while the user reviews the next best item.",
        }));
      }, 23800),
    ];

    return () => [...timers, ...interactionTimers].forEach(window.clearTimeout);
  }, [isRunning]);

  const elapsed = useElapsed(startedAt);
  const progress = useMemo(() => {
    if (!isRunning) return 0;
    return Math.min(100, Math.round((elapsed / 30000) * 100));
  }, [elapsed, isRunning]);

  return { state, progress };
}

function useElapsed(startedAt: number | null) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startedAt) {
      return;
    }

    const interval = window.setInterval(() => {
      setElapsed(Date.now() - startedAt);
    }, 250);

    return () => window.clearInterval(interval);
  }, [startedAt]);

  return elapsed;
}
