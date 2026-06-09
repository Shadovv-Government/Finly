# Repository Guidelines

## Project Structure & Module Organization
`src/` contains the application code. Use `src/app/` for UI screens, components, hooks, routes, contexts, and shared app utilities; use `src/db/` for Dexie/IndexedDB schema, validators, analytics, AI, recurring processing, export/import, and CRUD operations; use `src/lib/` for ML classifier, forecasting, seasonality, and health score utilities; use `src/services/` for AI client and context builder. Shared styles live in `src/styles/`, test setup in `src/test/setup.ts`, static assets and ML models in `public/`, and maintenance scripts in `scripts/`. Reference docs such as `ARCHITECTURE.md`, `DATABASE_SCHEMA.md`, `DATABASE_FIELDS.md`, and `APP_STACK_AND_FEATURES.md` should be updated when behavior or data contracts change.

## Build, Test, and Development Commands
Run `npm run dev` to start the Vite dev server. Run `npm run dev:full` to start Vite + Vercel Function (required for online AI chat). Run `npm run build` to type-check with `tsc` and produce a production bundle. Run `npm run preview` to inspect the built app locally. Use `npm run lint` for the ESLint gate, `npm test` for a one-shot Vitest run, `npm run test:watch` during development, `npm run test:ui` for the visual test runner, and `npm run test:coverage` before opening larger PRs.

## Coding Style & Naming Conventions
This repository uses TypeScript + React with ESLint from `.eslintrc.cjs`. Match the existing style: functional components, hooks-first state management, and concise comments only where logic is non-obvious. Use `PascalCase` for components and screens (`AddTransactionForm.tsx`), `camelCase` for hooks and utilities (`useTransactions.ts`, `formatCurrency.ts`), and colocate tests beside the module they cover (`*.test.ts` or `*.test.tsx`). Prefer the `@/` alias from `vite.config.ts` over long relative imports when it improves readability.

## Testing Guidelines
Vitest runs in `jsdom` with Testing Library, `fake-indexeddb`, and shared mocks from `src/test/setup.ts`. Name tests `*.test.ts` or `*.test.tsx`; colocate them with the source file. Coverage thresholds are 50% globally for branches, functions, lines, and statements. Add or update tests whenever touching `src/db/operations/*`, hooks, form logic, error handling, AI/ML modules, or validators. The project has 345+ tests across 33 test files.

## Commit & Pull Request Guidelines
Recent history uses short subjects and occasional Conventional Commit prefixes, for example `fix: ...` or `feat: ...`. Prefer imperative, scoped messages such as `fix: guard empty transaction category` or `test: cover recurring processor edge case`. PRs should include a brief summary, linked issue or task, notes on schema/storage changes, and screenshots or short recordings for UI changes. Call out PWA, offline, IndexedDB migration risks, or AI proxy changes explicitly.

## Architecture Notes
- **Offline-first:** all user data lives in IndexedDB (Dexie.js, 9 tables, schema v3)
- **AI proxy:** the only server-side code is `api/ai-chat.ts` — a Vercel Function that proxies chat requests to OpenRouter keeping the API key server-side
- **ML pipeline:** TensorFlow.js classifier with 5-tier pipeline (LRU cache → user overrides → rule engine → ML with MC Dropout → fallback). Background Sync API for incremental fine-tuning
- **Receipt scanner:** multi-engine (QR via BarcodeDetector API + jsQR fallback → Tesseract.js OCR), all lazy-loaded
- **Auth:** local device-only (WebAuthn biometric + PIN fallback), no server accounts
- **PWA:** custom Service Worker with Workbox (injectManifest mode), CacheFirst/NetworkFirst/StaleWhileRevalidate strategies

## Security & Configuration Tips
Do not commit real financial data or secrets. Keep PWA assets, `public/manifest.json`, and model files in sync with app behavior. When changing IndexedDB schema (`src/db/db.ts`) or seed data (`src/db/seed.ts`), verify upgrade paths locally (v1→v2→v3) and document user-impacting changes in the architecture or database docs. Never expose API keys in client code — use Vercel environment variables for server-side secrets. The CSP in `index.html` restricts all resources to `'self'`.
