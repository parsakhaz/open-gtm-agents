# Web Research Test: Next.js 16 Turbopack

Date: 2026-04-30

## Research dimensions

- Current Turbopack status in Next.js 16.
- Version-change details and migration-sensitive notes.
- Local dev behavior relevant to this repo's `next dev` output.

## Sources

- Next.js 16 release note, published 2025-10-21: https://nextjs.org/blog/next-16
- Current Next.js Turbopack API reference, last updated 2026-02-27: https://nextjs.org/docs/app/api-reference/turbopack
- Current Next.js `turbopack` config reference, last updated 2026-02-27: https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopack

## Findings

- Next.js 16 makes Turbopack the default bundler for Next.js apps, according to the official Next.js 16 release note and the current Turbopack API reference.
- The Next.js 16 release note says Turbopack is stable for both development and production builds, with reported improvements of 2-5x faster production builds and up to 10x faster Fast Refresh.
- The Turbopack API reference version table records `v16.0.0` as the version where Turbopack became the default bundler and automatic Babel support was added when a Babel config is present.
- The current config reference says the `turbopack` option replaces the older `experimental.turbo` name, and notes that `experimental.turbo` was used in Next.js 13.0.0 through 15.2.x.
- The current Turbopack API reference says trace files for performance debugging can be generated with `NEXT_TURBOPACK_TRACING=1 next dev`, producing `.next/dev/trace-turbopack`.
- This aligns with the local server output observed in this repo, which reported `Next.js 16.2.4 (Turbopack)` when `npm run dev` started.

## Conflicts or changes over time

- Older Next.js 13 and 14 documentation described Turbopack as beta and `next dev`-focused. The current Next.js 16 documentation supersedes those older versioned docs for this repo because the local install is Next.js 16.2.4.

## Confidence

High. The synthesis relies on official Next.js documentation and the official Next.js 16 release note, plus the local `npm run dev` output from this workspace.

## Open questions

- If this repo has custom webpack behavior, confirm whether it should use Next.js 16's `--webpack` flag instead of the default Turbopack path.
