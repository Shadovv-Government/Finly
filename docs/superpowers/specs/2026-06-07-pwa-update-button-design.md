# PWA Update Button — Design Spec

**Date:** 2026-06-07  
**Status:** Approved

## Problem

When a new build is deployed, the Service Worker updates silently but the page is never reloaded — users keep running the old JS bundle. The only way to get the update is to close and reopen the app multiple times.

## Solution

Surface the update to the user with (C) both automatic toast + manual Settings button.

## Architecture

### 1. `vite.config.ts` change

`registerType: 'autoUpdate'` → `'prompt'`

Reason: with `autoUpdate`, SKIP_WAITING fires immediately without user consent and there's no reload. With `prompt`, we control exactly when the update is applied.

### 2. `src/app/contexts/PWAUpdateContext.tsx` (new file)

Wraps `useRegisterSW` from `virtual:pwa-register/react` (bundled with vite-plugin-pwa). Exposes:

```ts
interface PWAUpdateContextValue {
  needRefresh: boolean;
  offlineReady: boolean;
  updateApp: () => void;
}
```

`updateApp()` calls `updateServiceWorker(true)` — sends SKIP_WAITING to the waiting SW and reloads the page.

Provider added to `App.tsx` (inside `<ThemeProvider>`, outside `<AuthProvider>`).

### 3. Toast in `App.tsx`

`AppContent` consumes `PWAUpdateContext`. When `needRefresh` becomes true, shows a persistent Sonner toast:

> "Доступно обновление Finly"  
> Action: `[Обновить]` — calls `updateApp()`

Toast is dismissed when user clicks "Обновить" or "Позже".

### 4. Settings section "Приложение"

New `AppUpdateSection` component in `Settings.tsx`. Two states:

- `needRefresh = true` → purple icon + "Доступно обновление" label + `[Обновить]` button
- `needRefresh = false` → grey icon + "Приложение актуально" (no button)

Placed before the "О приложении" section (before component library links).

## Files changed

| File | Action |
|------|--------|
| `vite.config.ts` | Change `registerType` |
| `src/app/contexts/PWAUpdateContext.tsx` | Create |
| `src/app/App.tsx` | Add provider + toast logic |
| `src/app/screens/Settings.tsx` | Add `AppUpdateSection` |

## TypeScript

`virtual:pwa-register/react` is typed by vite-plugin-pwa — no extra `@types` needed.
