# Dry Run Implementation Plan

## Current State

The repository currently contains product and architecture documentation only:

- `README.md`
- `docs/project-brief.md`
- `docs/technical-architecture.md`
- `docs/dry-run-demo.md`
- `docs/open-questions.md`

There is no Next.js app scaffold yet. The dry run should therefore start by creating the frontend app, design system, and seeded event flow before wiring real research integrations.

## Goal

Build the complete dry-run demo experience for Open GTM Agents.

The first implementation should let a judge see the product working end to end with hardcoded/demo data:

1. User enters a landing page URL.
2. Agent launches a live onboarding analysis.
3. Website preview appears in an iframe-style browser frame.
4. The preview slowly scrolls and navigates through simulated website sections.
5. GTM schema answers stream in on the right.
6. Agent transitions into live opportunity discovery.
7. Comment opportunities and original post suggestions stream into the feed.
8. User opens a card, rewrites a draft, and approves or copies it.
9. Final state shows hourly monitoring and Resend approval email concept.

## Design Direction

Use a clean, operational GTM product aesthetic: dense, polished, and credible. The UI should feel more like a serious workflow surface than a landing page or chat demo.

Use:

- Next.js
- Tailwind v4
- shadcn/ui
- lucide-react icons
- Supabase-inspired theme from tweakcn
- Outfit font

Install the shadcn theme with:

```bash
npx shadcn@latest add https://tweakcn.com/r/themes/supabase.json
```

Global CSS should use the provided Tailwind v4 token setup:

```css
@import "tailwindcss";

@custom-variant dark (&:is(.dark *));

:root {
  --background: oklch(0.9911 0 0);
  --foreground: oklch(0.2046 0 0);
  --card: oklch(0.9911 0 0);
  --card-foreground: oklch(0.2046 0 0);
  --popover: oklch(0.9911 0 0);
  --popover-foreground: oklch(0.4386 0 0);
  --primary: oklch(0.8348 0.1302 160.9080);
  --primary-foreground: oklch(0.2626 0.0147 166.4589);
  --secondary: oklch(0.9940 0 0);
  --secondary-foreground: oklch(0.2046 0 0);
  --muted: oklch(0.9461 0 0);
  --muted-foreground: oklch(0.2435 0 0);
  --accent: oklch(0.9461 0 0);
  --accent-foreground: oklch(0.2435 0 0);
  --destructive: oklch(0.5523 0.1927 32.7272);
  --destructive-foreground: oklch(0.9934 0.0032 17.2118);
  --border: oklch(0.9037 0 0);
  --input: oklch(0.9731 0 0);
  --ring: oklch(0.8348 0.1302 160.9080);
  --chart-1: oklch(0.8348 0.1302 160.9080);
  --chart-2: oklch(0.6231 0.1880 259.8145);
  --chart-3: oklch(0.6056 0.2189 292.7172);
  --chart-4: oklch(0.7686 0.1647 70.0804);
  --chart-5: oklch(0.6959 0.1491 162.4796);
  --sidebar: oklch(0.9911 0 0);
  --sidebar-foreground: oklch(0.5452 0 0);
  --sidebar-primary: oklch(0.8348 0.1302 160.9080);
  --sidebar-primary-foreground: oklch(0.2626 0.0147 166.4589);
  --sidebar-accent: oklch(0.9461 0 0);
  --sidebar-accent-foreground: oklch(0.2435 0 0);
  --sidebar-border: oklch(0.9037 0 0);
  --sidebar-ring: oklch(0.8348 0.1302 160.9080);
  --font-sans: Outfit, sans-serif;
  --font-serif: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
  --font-mono: monospace;
  --radius: 0.5rem;
  --tracking-normal: 0.025em;
  --spacing: 0.25rem;
}

.dark {
  --background: oklch(0.1822 0 0);
  --foreground: oklch(0.9288 0.0126 255.5078);
  --card: oklch(0.2046 0 0);
  --card-foreground: oklch(0.9288 0.0126 255.5078);
  --popover: oklch(0.2603 0 0);
  --popover-foreground: oklch(0.7348 0 0);
  --primary: oklch(0.4365 0.1044 156.7556);
  --primary-foreground: oklch(0.9213 0.0135 167.1556);
  --secondary: oklch(0.2603 0 0);
  --secondary-foreground: oklch(0.9851 0 0);
  --muted: oklch(0.2393 0 0);
  --muted-foreground: oklch(0.7122 0 0);
  --accent: oklch(0.3132 0 0);
  --accent-foreground: oklch(0.9851 0 0);
  --destructive: oklch(0.3123 0.0852 29.7877);
  --destructive-foreground: oklch(0.9368 0.0045 34.3092);
  --border: oklch(0.2809 0 0);
  --input: oklch(0.2603 0 0);
  --ring: oklch(0.8003 0.1821 151.7110);
  --font-sans: Outfit, sans-serif;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --font-sans: var(--font-sans);
  --font-mono: var(--font-mono);
  --font-serif: var(--font-serif);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }

  body {
    @apply bg-background text-foreground;
    letter-spacing: var(--tracking-normal);
  }
}
```

Root layout should use the Outfit font:

```tsx
import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const fontSans = Outfit({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Open GTM Agents",
  description: "Agent-native social listening and GTM opportunity discovery.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${fontSans.variable} antialiased`}>{children}</body>
    </html>
  );
}
```

## Implementation Tasks

### 1. Scaffold The App

Create a Next.js app in the repo root.

Recommended setup:

- App Router
- TypeScript
- Tailwind v4
- ESLint
- `src/` directory if the scaffold asks

Add shadcn/ui and install the Supabase theme from tweakcn.

Initial components to add:

- `button`
- `card`
- `badge`
- `input`
- `tabs`
- `sheet`
- `scroll-area`
- `skeleton`
- `progress`
- `tooltip`
- `separator`

### 2. Create Dry Run Data And Event Model

Add seeded dry-run data for one hardcoded demo product.

The product URL will be provided later. Until then, use a placeholder constant that can be swapped in one file.

Suggested files:

- `src/lib/dry-run/types.ts`
- `src/lib/dry-run/demo-data.ts`
- `src/lib/dry-run/events.ts`
- `src/lib/dry-run/use-dry-run.ts`

Dry-run event types:

```ts
type DryRunEvent =
  | { type: "status"; stage: string; message: string }
  | { type: "website_focus"; section: string; scrollTo: number }
  | { type: "schema_answer"; section: string; value: string; confidence: number }
  | { type: "suggestions"; section: string; suggestions: string[] }
  | { type: "source_search"; source: string; query: string }
  | { type: "opportunity"; card: OpportunityCard }
  | { type: "done" };
```

Seed data should include:

- website sections
- schema answers
- suggestion chips
- source search events
- comment opportunity cards
- original post suggestion cards
- competitive insight cards
- draft rewrite variants

### 3. Build The Landing Screen

Create the first screen as the actual product, not a marketing landing page.

It should include:

- compact product header
- URL input
- primary action to start dry run
- examples of what the agent will do
- no oversized hero section

The submitted URL can route into the dry-run page while using hardcoded data.

### 4. Build The Agent Run Shell

Create a full-screen work surface for the dry run.

Suggested layout:

- Top bar: product name, active URL, run status
- Main split pane during onboarding
- Later switch to opportunity discovery layout
- Persistent progress/timeline area

This shell should own the dry-run state machine.

### 5. Build The Website Preview Frame

Create an iframe-style browser preview component.

Dry-run behavior:

- Display simulated website content from seeded sections.
- Show a URL bar with the submitted or hardcoded URL.
- Slowly auto-scroll the content.
- Navigate between seeded sections like Home, Pricing, Docs, Changelog, GitHub.
- Highlight the current section while the schema answer streams.

Suggested file:

- `src/components/dry-run/website-preview-frame.tsx`

Do not depend on a real external iframe for the first version. Many websites block iframe embedding. Simulated content gives a reliable demo.

### 6. Build The Streaming Schema Panel

Create the right-side schema panel.

Sections:

- Product summary
- Target customer
- Pain points
- Competitors and alternatives
- Differentiators
- Search angles
- Communities and sources
- Engagement tone
- Things to avoid

Each schema card should support:

- pending state
- streamed answer state
- confidence badge
- source hint
- 2-3 suggestion chips
- edit affordance

Suggested files:

- `src/components/dry-run/schema-stream-panel.tsx`
- `src/components/dry-run/schema-answer-card.tsx`

### 7. Build Source Activity Timeline

Create a compact source timeline that makes the agent feel active.

Events should show:

- reading website
- mapping competitors
- generating search angles
- searching Reddit
- searching Hacker News
- searching GitHub issues
- searching X/web
- deduping prior feed
- drafting comments
- drafting post ideas

Suggested file:

- `src/components/dry-run/source-activity-timeline.tsx`

### 8. Build Opportunity Feed

Create opportunity cards for:

- comment opportunities
- original post suggestions
- competitive insights

Cards should include:

- source badge
- card type
- title
- source URL
- rationale
- suggested action
- fit score
- risk score
- draft preview
- approve/copy/dismiss actions

Suggested files:

- `src/components/dry-run/opportunity-feed.tsx`
- `src/components/dry-run/opportunity-card.tsx`
- `src/components/dry-run/opportunity-detail-sheet.tsx`

### 9. Build Draft Rewrite Interactions

Inside the detail sheet, add rewrite controls:

- shorter
- softer
- more technical
- more direct

Dry-run rewrites can be seeded variants with a short streamed text effect.

### 10. Build Final Monitoring State

After the dry run completes, show a final state:

- hourly monitoring enabled
- next run time
- Resend approval email preview
- count of opportunities found
- count of drafts awaiting approval

Suggested component:

- `src/components/dry-run/monitoring-summary.tsx`

### 11. Polish For Demo

Focus areas:

- smooth staggered reveals
- stable layout with no content jumps
- responsive desktop-first layout
- readable compact typography
- source-specific badges
- subtle motion that does not distract
- clear visual difference between comment opportunities and original post suggestions

Avoid:

- generic chat UI
- marketing hero layout
- nested cards
- huge decorative gradients
- text that shifts or overflows
- relying on real iframes for the demo

### 12. Verification

Run:

```bash
npm run lint
npm run build
npm run dev
```

Then verify manually:

- URL entry starts the dry run.
- Website preview scrolls and changes sections.
- Schema answers stream on the right.
- Source activity updates over time.
- Opportunity cards appear progressively.
- Detail sheet opens.
- Rewrite controls work.
- Approval/copy actions are visible.
- Final monitoring state appears.
- Layout works at desktop and reasonable laptop widths.

If Playwright is available, take screenshots at:

- initial URL entry
- onboarding analysis mid-stream
- opportunity discovery mid-stream
- opportunity detail sheet
- final monitoring state

## Recommended Build Order

1. Scaffold app and theme.
2. Add dry-run types and seeded data.
3. Build URL input and route into the dry-run shell.
4. Build website preview frame.
5. Build streaming schema panel.
6. Build event timing/state machine.
7. Build activity timeline.
8. Build opportunity feed and detail sheet.
9. Add rewrite variants and approval actions.
10. Add final monitoring summary.
11. Polish motion, responsive layout, and visual hierarchy.
12. Run lint/build and start dev server.

## Approval Gate

Before implementation, confirm:

- The hardcoded demo product URL.
- Whether the dry run should use BeamBell, Salon Agent, or another product.
- Whether to scaffold the Next.js app directly in the repo root.

