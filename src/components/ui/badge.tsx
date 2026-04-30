import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  variant?: "default" | "secondary" | "outline" | "success" | "warning";
}) {
  const variants = {
    default: "bg-foreground text-background",
    secondary: "bg-muted text-muted-foreground",
    outline: "border bg-background text-foreground",
    success: "bg-primary/30 text-primary-foreground",
    warning: "bg-[#fff4d8] text-[#7a4d00]",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
