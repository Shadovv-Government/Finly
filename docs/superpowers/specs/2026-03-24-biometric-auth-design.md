# Biometric Authentication (Face ID / Fingerprint) — Design Spec

**Date:** 2026-03-24
**Status:** ✅ Реализовано (соответствует спецификации)

---

## Overview

Add biometric app-lock to Finly using the Web Authentication API (WebAuthn). After 5 minutes of inactivity, the app locks and requires Face ID, Touch ID, or fingerprint to resume. Users can enable/disable biometrics in Settings and are offered setup during Registration.

---

## Architecture

### New: `src/app/hooks/useBiometric.ts`

Encapsulates all WebAuthn logic and lock state. Exposes:

```ts
{
  isSupported: boolean       // navigator.credentials + PublicKeyCredential available
  isEnabled: boolean         // biometric_enabled from AppSettings
  isLocked: boolean          // true when timeout has elapsed
  enable: () => Promise<void>   // registers WebAuthn credential + sets isEnabled=true
  disable: () => Promise<void>  // clears credential + sets isEnabled=false
  unlock: () => Promise<void>   // calls credentials.get(), sets isLocked=false on success
}
```

**Timeout logic:**
- On mount, reads `biometric_last_active` from IndexedDB once
- Registers event listeners on `document`: `visibilitychange`, `pointerdown`, `keydown` — all update a `lastActive` ref (in-memory only, no IndexedDB writes per-event)
- On `visibilitychange` to visible: checks `Date.now() - lastActive.current > 5 * 60 * 1000` → sets `isLocked = true` if exceeded
- Also runs a `setInterval` (every 60 seconds) as fallback for foreground-only usage: if the app stays visible but idle for 5+ min (e.g. desktop), the interval check will still lock it
- On page `beforeunload`, writes `biometric_last_active` to IndexedDB
- On unmount, also writes `biometric_last_active` to IndexedDB

**Mounting:** `useBiometric` is called inside `AuthProvider` in `src/app/contexts/AuthContext.tsx`. Since `AuthProvider` wraps the entire app (see `src/main.tsx`), the listeners and interval are active for the full app lifetime. No extra wiring needed — the lock state is accessible to all consumers via `useAuth().biometric`.

### Modified: `src/app/contexts/AuthContext.tsx`

Composes `useBiometric` and adds to context value:

```ts
biometric: {
  isSupported, isEnabled, isLocked, enable, disable, unlock
}
```

`logout()` is extended to call `clearBiometricSettings()` before returning, ensuring biometric keys are purged from IndexedDB. This prevents a subsequent new user registration on the same device from inheriting a stale credential ID.

### Modified: `src/app/routes.tsx`

`ProtectedRoute` checks `biometric.isEnabled && biometric.isLocked` → renders `<LockScreen />` instead of children.

---

## Components

### `src/app/screens/LockScreen.tsx`

Full-screen lock overlay. Shows:
- User avatar + name (from `useAuth`)
- Fingerprint/face icon (Lucide `Fingerprint`)
- "Войти с биометрией" button → calls `unlock()`
- Error state on `NotAllowedError` with "Попробуйте снова" retry button
- **Permanent failure escape hatch**: after 3 consecutive `NotAllowedError` failures, shows a secondary button "Войти без биометрии (сброс)" that calls `disable()` and unlocks the app. This prevents lock-out if the biometric sensor is broken/unavailable. The button is intentionally secondary (smaller, muted) to avoid accidental taps.
- Auto-triggers `unlock()` on mount (so the native dialog appears immediately)

### `src/app/components/BiometricSetupCard.tsx`

Reusable card shown in two places:

1. **Registration** (`src/app/screens/Registration.tsx`): After successful `register()`, renders a step "Защитите приложение" with "Включить" / "Пропустить" buttons. If `isSupported === false`, this step is skipped entirely and the app navigates directly.

2. **Settings** (`src/app/screens/Settings.tsx`): New "Безопасность" section with a Switch (`isEnabled`) and a description line. If `isSupported === false`, entire section is hidden.

---

## Data Storage (IndexedDB `AppSettings`)

| Key | Type | Description |
|-----|------|-------------|
| `biometric_enabled` | `boolean` | Whether biometric lock is active |
| `biometric_credential_id` | `string` | Base64-encoded WebAuthn credential ID |
| `biometric_last_active` | `number` | Unix timestamp of last user activity (written on page hide/unload) |

---

## WebAuthn Implementation

**Credential registration (`enable`):**
```ts
navigator.credentials.create({
  publicKey: {
    challenge: crypto.getRandomValues(new Uint8Array(32)),
    rp: { name: 'Finly', id: window.location.hostname },
    user: {
      id: new TextEncoder().encode(String(userId)),  // userId is a string uuid
      name: userName,
      displayName: userName,
    },
    pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
    authenticatorSelection: {
      authenticatorAttachment: 'platform',  // device biometric only, no security keys
      userVerification: 'required',
    },
    timeout: 60000,
  }
})
```

Saves `credential.id` (base64url string) → `biometric_credential_id` in IndexedDB.

**Authentication (`unlock`):**
```ts
navigator.credentials.get({
  publicKey: {
    challenge: crypto.getRandomValues(new Uint8Array(32)),
    allowCredentials: [{
      type: 'public-key',
      id: base64urlDecode(storedCredentialId),  // decode back to ArrayBuffer
    }],
    userVerification: 'required',
    timeout: 60000,
  }
})
```

> **Note on challenge security:** For a local app-lock with no server, a random challenge is acceptable — we are not verifying a server-side assertion, only proving device biometric presence. The credential never leaves the device's secure enclave.

---

## Error Handling

| Error | Handling |
|-------|----------|
| `NotSupportedError` / no `PublicKeyCredential` | `isSupported = false`, biometric UI hidden |
| `NotAllowedError` (user cancelled / sensor failure) | Show "Попробуйте снова"; after 3 consecutive failures, show "Войти без биометрии (сброс)" escape hatch |
| `InvalidStateError` / `NotFoundError` (credential deleted from OS) | Auto-disable biometric (`biometric_enabled = false`), user enters app normally, Settings shows biometric as off |
| User logs out | `logout()` calls `clearBiometricSettings()` — clears `biometric_enabled`, `biometric_credential_id`, `biometric_last_active` from IndexedDB |

---

## User Flows

### Registration flow (new user)
1. User enters name → taps "Начать"
2. `register()` succeeds
3. If `isSupported`: show `BiometricSetupCard` before navigating
4. User taps "Включить" → `enable()` → native biometric dialog → success → navigate to `/`
5. User taps "Пропустить" → navigate to `/` immediately
6. If `isSupported === false`: navigate to `/` immediately (step 3–5 skipped)

### Settings flow (existing user)
1. Settings → "Безопасность" section
2. Switch OFF → ON: calls `enable()` → native biometric dialog → on success switch stays ON; on failure switch reverts to OFF
3. Switch ON → OFF: calls `disable()` → clears credential, switch turns OFF

### Unlock flow (after 5-min timeout)
1. App returns from background (or foreground idle timer fires)
2. `isLocked = true` → `ProtectedRoute` renders `<LockScreen />`
3. LockScreen auto-calls `unlock()` on mount → native biometric dialog appears
4. Success → `isLocked = false` → app content renders
5. Failure → error state with "Попробуйте снова" + (after 3 failures) "Войти без биометрии (сброс)"

---

## Testing

### `src/app/hooks/useBiometric.test.ts`
- `navigator.credentials` mocked via `vi.stubGlobal`
- Test: `enable()` encodes userId correctly with `TextEncoder` and stores credential ID
- Test: timeout > 5 min on `visibilitychange` sets `isLocked = true`
- Test: timeout < 5 min does not lock
- Test: `setInterval` fires after 5 min idle in foreground, sets `isLocked = true`
- Test: `NotAllowedError` on `unlock()` does not unlock; `failureCount` increments
- Test: 3× `NotAllowedError` exposes `disable()` escape hatch
- Test: `NotFoundError` on `unlock()` auto-disables biometric

### `src/app/screens/LockScreen.test.tsx`
- Renders avatar + username
- Calls `unlock()` on mount
- Shows error message on failure, retry button works
- Shows escape hatch button after 3 failures

---

## Files Changed

| File | Change |
|------|--------|
| `src/app/hooks/useBiometric.ts` | New |
| `src/app/screens/LockScreen.tsx` | New |
| `src/app/components/BiometricSetupCard.tsx` | New |
| `src/app/contexts/AuthContext.tsx` | Add biometric to context; extend `logout()` to call `clearBiometricSettings()` |
| `src/app/routes.tsx` | Add lock check to ProtectedRoute |
| `src/app/screens/Registration.tsx` | Add BiometricSetupCard step after register |
| `src/app/screens/Settings.tsx` | Add "Безопасность" section |
| `src/db/operations/biometric.ts` | Add helpers: `getBiometricSettings`, `setBiometricSetting`, `clearBiometricSettings` |
