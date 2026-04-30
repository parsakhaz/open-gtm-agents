import { Globe2 } from "lucide-react";
import { SimpleIcon } from "@/components/brand/simple-icon";
import type { SourceId } from "@/lib/dry-run/types";

export function SourceIcon({ source, className }: { source: SourceId; className?: string }) {
  if (source === "reddit") return <SimpleIcon slug="reddit" className={className} />;
  if (source === "x") return <SimpleIcon slug="x" className={className} />;
  if (source === "hacker_news") return <SimpleIcon slug="ycombinator" className={className} />;
  if (source === "github") return <SimpleIcon slug="github" className={className} />;
  if (source === "resend") return <SimpleIcon slug="resend" className={className} />;
  return <Globe2 className={className} />;
}

export function sourceLabel(source: SourceId) {
  const labels: Record<SourceId, string> = {
    reddit: "Reddit",
    x: "X",
    hacker_news: "Hacker News",
    github: "GitHub",
    web: "Web",
    resend: "Resend",
  };

  return labels[source];
}
