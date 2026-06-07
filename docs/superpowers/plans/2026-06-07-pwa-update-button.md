# PWA Update Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить тост-уведомление и кнопку в настройках, которые позволяют пользователю установить обновление PWA одним нажатием.

**Architecture:** Меняем `registerType` на `'prompt'` чтобы контролировать момент применения обновления. Создаём `PWAUpdateContext`, который оборачивает `useRegisterSW` из vite-plugin-pwa и шарит состояние `needRefresh` + функцию `updateApp` между тостом в `App.tsx` и кнопкой в `Settings.tsx`.

**Tech Stack:** vite-plugin-pwa (`useRegisterSW` / `virtual:pwa-register/react`), React context, Sonner toast

---

## File Map

| Файл | Действие |
|------|----------|
| `vite.config.ts` | Изменить `registerType: 'autoUpdate'` → `'prompt'` |
| `src/vite-env.d.ts` | Добавить `/// <reference types="vite-plugin-pwa/react" />` |
| `src/app/contexts/PWAUpdateContext.tsx` | Создать — провайдер + хук `usePWAUpdate` |
| `src/app/App.tsx` | Добавить `<PWAUpdateProvider>` + toast в `AppContent` |
| `src/app/screens/Settings.tsx` | Добавить `AppUpdateSection` перед блоком "О приложении" |

---

### Task 1: Изменить конфиг Vite и добавить TypeScript-типы

**Files:**
- Modify: `vite.config.ts:12`
- Modify: `src/vite-env.d.ts:1`

- [ ] **Step 1: Изменить registerType**

В `vite.config.ts` найди строку `registerType: 'autoUpdate',` и замени на:

```ts
registerType: 'prompt',
```

- [ ] **Step 2: Добавить reference для типов виртуального модуля**

В `src/vite-env.d.ts` добавь строку после первой строки:

```ts
/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />
```

- [ ] **Step 3: Убедиться что TypeScript не ругается**

```bash
npx tsc --noEmit
```

Ожидаемо: 0 ошибок.

- [ ] **Step 4: Commit**

```bash
git add vite.config.ts src/vite-env.d.ts
git commit -m "chore: switch PWA registerType to prompt for manual update control"
```

---

### Task 2: Создать PWAUpdateContext

**Files:**
- Create: `src/app/contexts/PWAUpdateContext.tsx`

- [ ] **Step 1: Создать файл контекста**

Создай `src/app/contexts/PWAUpdateContext.tsx`:

```tsx
import { createContext, useContext } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

interface PWAUpdateContextValue {
  needRefresh: boolean;
  updateApp: () => void;
}

const PWAUpdateContext = createContext<PWAUpdateContextValue>({
  needRefresh: false,
  updateApp: () => {},
});

export function PWAUpdateProvider({ children }: { children: React.ReactNode }) {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  const updateApp = () => updateServiceWorker(true);

  return (
    <PWAUpdateContext.Provider value={{ needRefresh, updateApp }}>
      {children}
    </PWAUpdateContext.Provider>
  );
}

export function usePWAUpdate() {
  return useContext(PWAUpdateContext);
}
```

`useRegisterSW()` возвращает:
- `needRefresh: [boolean, setter]` — true когда новый SW ждёт активации
- `updateServiceWorker(reloadPage?: boolean)` — отправляет SKIP_WAITING и при `true` перезагружает страницу

- [ ] **Step 2: Проверить TypeScript**

```bash
npx tsc --noEmit
```

Ожидаемо: 0 ошибок.

- [ ] **Step 3: Commit**

```bash
git add src/app/contexts/PWAUpdateContext.tsx
git commit -m "feat: add PWAUpdateContext for service worker update management"
```

---

### Task 3: Интегрировать в App.tsx — провайдер + toast

**Files:**
- Modify: `src/app/App.tsx`

- [ ] **Step 1: Добавить импорты в App.tsx**

В начало `src/app/App.tsx` добавь импорты:

```ts
import { useEffect } from 'react';  // уже есть — не дублируй
import { toast } from 'sonner';
import { PWAUpdateProvider, usePWAUpdate } from './contexts/PWAUpdateContext';
```

`toast` из `sonner` — уже в зависимостях проекта.

- [ ] **Step 2: Добавить логику тоста в AppContent**

Замени функцию `AppContent` на:

```tsx
function AppContent() {
  const { needRefresh, updateApp } = usePWAUpdate();

  useEffect(() => {
    if (!needRefresh) return;
    toast('Доступно обновление Finly', {
      duration: Infinity,
      action: {
        label: 'Обновить',
        onClick: updateApp,
      },
    });
  }, [needRefresh, updateApp]);

  return (
    <AuthGuard>
      <RouterProvider router={router} />
    </AuthGuard>
  );
}
```

`duration: Infinity` — тост не уходит сам, пользователь должен нажать "Обновить" или закрыть вручную.

- [ ] **Step 3: Добавить PWAUpdateProvider в дерево**

Замени функцию `App` на:

```tsx
export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <SettingsProvider>
          <PWAUpdateProvider>
            <AuthProvider>
              <AppContent />
              <Toaster />
            </AuthProvider>
          </PWAUpdateProvider>
        </SettingsProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
```

- [ ] **Step 4: Проверить TypeScript**

```bash
npx tsc --noEmit
```

Ожидаемо: 0 ошибок.

- [ ] **Step 5: Commit**

```bash
git add src/app/App.tsx
git commit -m "feat: show update toast when new PWA version is available"
```

---

### Task 4: Добавить AppUpdateSection в Settings

**Files:**
- Modify: `src/app/screens/Settings.tsx`

- [ ] **Step 1: Добавить импорты в Settings.tsx**

В начало `src/app/screens/Settings.tsx` добавь в список импортов из `lucide-react` иконку `RefreshCw`:

```ts
import {
  Sun, Moon, Monitor, ChevronRight, Download, Upload, Bell, Repeat, LogOut,
  Pencil, Fingerprint, AlertTriangle, Target, FileJson, FileSpreadsheet, Sparkles,
  ImagePlus, RefreshCw,
} from 'lucide-react';
```

И добавь импорт хука (после строки с импортом `usePremium`):

```ts
import { usePWAUpdate } from '../contexts/PWAUpdateContext';
```

- [ ] **Step 2: Создать компонент AppUpdateSection**

Добавь новый компонент после `StatsSection` и перед `export const Settings`:

```tsx
// ==================== AppUpdateSection ====================

function AppUpdateSection() {
  const { needRefresh, updateApp } = usePWAUpdate();

  return (
    <div className="px-4 py-4">
      <h2 className="font-bold mb-3">Приложение</h2>
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <button
          onClick={needRefresh ? updateApp : undefined}
          disabled={!needRefresh}
          className="w-full flex items-center gap-3 p-4 disabled:opacity-60"
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            needRefresh ? 'bg-primary/10 dark:bg-primary/15' : 'bg-muted'
          }`}>
            <RefreshCw className={`w-5 h-5 ${
              needRefresh ? 'text-primary' : 'text-muted-foreground'
            }`} />
          </div>
          <div className="flex-1 text-left">
            <p className="font-medium">
              {needRefresh ? 'Доступно обновление' : 'Приложение актуально'}
            </p>
            <p className="text-xs text-muted-foreground">
              {needRefresh ? 'Нажмите для установки и перезагрузки' : 'Установлена последняя версия'}
            </p>
          </div>
          {needRefresh && (
            <span className="px-3 py-1.5 bg-primary text-white text-sm font-medium rounded-lg">
              Обновить
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Добавить AppUpdateSection в JSX компонента Settings**

Найди в JSX `Settings` блок `{/* Статистика */}` (custom={6}) и добавь секцию `AppUpdateSection` **после** статистики и **перед** блоком "О приложении" (custom={8}):

```tsx
      {/* Обновления */}
      <motion.section custom={7} variants={sectionVariants} initial="hidden" animate="visible">
      <AppUpdateSection />
      </motion.section>
```

Итоговый порядок секций: ProfileSection → AppearanceSection → DataSection → SecuritySection → Уведомления → StatsSection → **AppUpdateSection** → О приложении → Выход

- [ ] **Step 4: Проверить TypeScript**

```bash
npx tsc --noEmit
```

Ожидаемо: 0 ошибок.

- [ ] **Step 5: Commit**

```bash
git add src/app/screens/Settings.tsx
git commit -m "feat: add update section to settings screen"
```

---

### Task 5: Ручная проверка в продакшн-билде

PWA-функциональность недоступна в dev-режиме (`devOptions.enabled: false`). Проверять нужно через `vite build` + `vite preview`.

- [ ] **Step 1: Собрать билд**

```bash
npm run build
```

Ожидаемо: успешная сборка, в `dist/` появится `sw.js`.

- [ ] **Step 2: Запустить preview-сервер**

```bash
npm run preview
```

Открыть `http://localhost:4173` в браузере.

- [ ] **Step 3: Убедиться что SW регистрируется**

В DevTools → Application → Service Workers: должен быть активный SW.

- [ ] **Step 4: Проверить раздел настроек**

Перейти в Настройки → раздел "Приложение": должна отображаться строка "Приложение актуально" (серая, задизаблена).

- [ ] **Step 5: Симулировать обновление**

В DevTools → Application → Service Workers → нажать "Update". В разделе настроек кнопка должна стать активной с текстом "Доступно обновление". Тост должен появиться автоматически.

- [ ] **Step 6: Нажать "Обновить"**

При нажатии страница должна перезагрузиться.
