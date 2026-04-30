"use client";

import { ExternalLink, Loader2, Send, XCircle, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import type { BrowserRunEvent } from "@/lib/browser-relay/types";
import { Button } from "@/components/ui/button";

type BrowserPostActionsProps = {
  url: string;
  comment: string;
  opportunityId: string;
};

type PostState = "idle" | "running" | "done" | "error";

export function BrowserPostActions({
  url,
  comment,
  opportunityId,
}: BrowserPostActionsProps) {
  const [state, setState] = useState<PostState>("idle");
  const [events, setEvents] = useState<BrowserRunEvent[]>([]);
  const [message, setMessage] = useState<string>("");

  async function postNow() {
    setState("running");
    setEvents([]);
    setMessage("Starting browser companion handoff...");

    try {
      const response = await fetch("/api/browser/post-comment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url, comment, opportunityId }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Post request failed with ${response.status}.`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as BrowserRunEvent;
          setEvents((current) => [...current, event]);
          updateStateFromEvent(event);
        }
      }
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Post now failed.");
    }
  }

  function updateStateFromEvent(event: BrowserRunEvent) {
    if (event.type === "browser_status") {
      setMessage(event.message);
    } else if (event.type === "orchestrator_decision") {
      setMessage(event.message);
    } else if (event.type === "browser_agent_step") {
      setMessage(event.message);
    } else if (event.type === "browser_agent_retry") {
      setMessage(event.message);
    } else if (event.type === "browser_tool_call") {
      setMessage(`Running ${event.command}...`);
    } else if (event.type === "browser_tool_result") {
      setMessage(event.preview || `${event.command} ${event.ok ? "completed" : "failed"}.`);
    } else if (event.type === "browser_handoff") {
      setState("error");
      setMessage(event.handoff.currentState.description);
    } else if (event.type === "browser_done") {
      setState(event.result.success ? "done" : "error");
      setMessage(event.result.summary);
    } else if (event.type === "browser_error") {
      setState("error");
      setMessage(event.message);
    }
  }

  const recentEvents = events.slice(-3);

  return (
    <div className="space-y-2">
      <div className="grid gap-2 md:grid-cols-2">
        <Button
          variant="outline"
          onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
        >
          <ExternalLink className="h-4 w-4" />
          Open
        </Button>
        <Button onClick={postNow} disabled={state === "running"}>
          {state === "running" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : state === "done" ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : state === "error" ? (
            <XCircle className="h-4 w-4" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          {state === "running" ? "Posting..." : state === "done" ? "Posted" : "Post now"}
        </Button>
      </div>
      {(message || recentEvents.length > 0) && (
        <div className="rounded-md border bg-card px-3 py-2 text-xs leading-5 text-muted-foreground">
          {message && <div className="font-medium text-foreground">{message}</div>}
          {recentEvents.length > 0 && (
            <div className="mt-1 space-y-1">
              {recentEvents.map((event, index) => (
                <div key={`${event.createdAt}-${index}`}>
                  {event.type.replace("browser_", "")}
                  {"command" in event ? `: ${event.command}` : ""}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
