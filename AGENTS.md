# Repository Guidelines

## Project Structure & Module Organization
`src/` contains the application code. Use `src/app/` for UI screens, components, hooks, routes, and shared app utilities; use `src/db/` for Dexie/IndexedDB schema, validators, analytics, and persistence operations. Shared styles live in `src/styles/`, test setup in `src/test/setup.ts`, static assets and the ML model in `public/`, and maintenance scripts in `scripts/`. Reference docs such as `ARCHITECTURE.md`, `DATABASE_SCHEMA.md`, and `DATABASE_FIELDS.md` should be updated when behavior or data contracts change.

## Build, Test, and Development Commands
Run `npm run dev` to start the Vite dev server. Run `npm run build` to type-check with `tsc` and produce a production bundle. Run `npm run preview` to inspect the built app locally. Use `npm run lint` for the ESLint gate, `npm test` for a one-shot Vitest run, `npm run test:watch` during development, and `npm run test:coverage` before opening larger PRs.

## Coding Style & Naming Conventions
This repository uses TypeScript + React with ESLint from `.eslintrc.cjs`. Match the existing style: functional components, hooks-first state management, and concise comments only where logic is non-obvious. Use `PascalCase` for components and screens (`AddTransactionForm.tsx`), `camelCase` for hooks and utilities (`useTransactions.ts`, `formatCurrency.ts`), and keep tests beside the module they cover. Prefer the `@/` alias from `vite.config.ts` over long relative imports when it improves readability.

## Testing Guidelines
Vitest runs in `jsdom` with Testing Library and shared mocks from `src/test/setup.ts`. Name tests `*.test.ts` or `*.test.tsx`; colocate them with the source file. Coverage thresholds are currently 50% globally for branches, functions, lines, and statements. Add or update tests whenever touching `src/db/operations/*`, hooks, form logic, or error handling.

## Commit & Pull Request Guidelines
Recent history uses short subjects and occasional Conventional Commit prefixes, for example `fix: ...`. Prefer imperative, scoped messages such as `fix: guard empty transaction category` or `test: cover recurring processor edge case`. PRs should include a brief summary, linked issue or task, notes on schema/storage changes, and screenshots or short recordings for UI changes. Call out PWA, offline, or IndexedDB migration risks explicitly.

## Security & Configuration Tips
Do not commit real financial data or secrets. Keep PWA assets, `public/manifest.json`, and model files in sync with app behavior. When changing IndexedDB schema or seed data, verify upgrade paths locally and document user-impacting changes in the architecture or database docs.
