# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Vite dev server on port 8080
- `npm run build` — production build (`build:dev` builds with development mode)
- `npm run lint` — ESLint over the repo
- `npm test` — Vitest single run; `npm run test:watch` for watch mode
- Single test: `npx vitest run src/path/to/file.test.ts` (or `-t "name"` to filter by test name)
- `npm run deploy` — builds then publishes `dist/` to GitHub Pages via `gh-pages`

## Architecture

Client-only SPA (no backend). Brazilian-Portuguese audit dashboard. React 18 + Vite + TypeScript + shadcn/ui (Radix) + Tailwind. Recharts for charts, react-router-dom for routing, TanStack Query is wired but data flows through Context not queries. Import alias `@` → `src/`.

**Two parallel audit domains, mirrored end to end.** Everything exists twice — a general "ROPS" domain and a "Clinical" domain. The pattern repeats across files: `types/audit.ts` + `types/clinical-audit.ts`, `lib/csv-parser.ts` + `lib/csv-parser-clinical.ts`, `lib/aggregators.ts` + `lib/aggregators-clinical.ts`, `pages/Dashboard.tsx` + `pages/ClinicalDashboard.tsx`. When changing one domain, check whether the other needs the same change.

**Data pipeline:** user uploads a CSV → `lib/csv-parser*` parses it (`parseQuestionHeader` splits headers like `Category [3- question text]` into `{category, number, text}`; responses normalized to `CONFORME | NÃO CONFORME | NÃO SE APLICA`, with typo fixes) → rows + parsed questions stored in `contexts/AppDataContext.tsx` → `lib/aggregators*` compute `QuestionStats` / `CategoryGroup` / `GlobalMetrics` for display.

**State:** `AppDataContext` is the single source of truth for loaded data (`rops`, `clinical`). It persists to `localStorage` (keys `audit-insights-rops`, `audit-insights-clinical`), serializing `Date` fields to ISO strings and rehydrating on mount. Quota errors are swallowed. There is no server — all data lives in the browser.

**Filters:** dashboard filter state (startDate, endDate, sector, category) lives in the URL via `hooks/use-dashboard-filters.ts` (`useSearchParams`), shared by both dashboards. Module-specific params use `setParam`/`searchParams` directly.

**Access gate:** `components/AccessGate` wraps the whole app; `lib/gate.ts` checks an obfuscated passphrase against `sessionStorage`. This is light client-side gating, not real auth — do not treat it as a security boundary.

**Routing / deploy:** uses `HashRouter` (not BrowserRouter) and Vite `base: '/audit-insights-hub/'` because it deploys to a GitHub Pages subpath. Keep both consistent if the deploy target changes.

**PDF export:** `lib/pdf-export.ts` via jsPDF + html2canvas-pro.

## Conventions

- UI primitives in `src/components/ui/` are shadcn/ui generated — prefer composing them over editing.
- User-facing strings are Portuguese (pt-BR); match existing copy and tone.
- This started as a Lovable project (`lovable-tagger` runs in dev builds).
