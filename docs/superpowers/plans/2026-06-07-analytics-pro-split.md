# Analytics Pro/Free Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge the basic and Pro analytics into a single `/analytics` screen with a tab switcher [Базовая | Pro], replace all amber/gold Pro colors with violet, rename "Premium" → "Pro" in all UI strings.

**Architecture:** `Analytics.tsx` gains local state `tab: 'basic' | 'pro'`. The basic tab renders the existing charts. The pro tab renders either the 4-tab Pro content (for subscribers) or a new compact upsell card (for non-subscribers). The standalone `/premium` route is replaced with a redirect to `/analytics`. A new `ProUpsellCompact.tsx` is the embedded upsell.

**Tech Stack:** React, react-router-dom, Tailwind CSS, framer-motion, lucide-react, existing hooks (`usePremium`, `useAnalytics`, etc.), existing premium tab components (`PredictiveTab`, `ComparativeTab`, `HealthTab`, `AIInsightsPanel`).

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `src/app/components/premium/ProUpsellCompact.tsx` | Compact Pro upsell card shown inside the Pro tab |
| Modify | `src/app/screens/Analytics.tsx` | Add tab switcher + conditional basic/pro rendering |
| Modify | `src/app/screens/PremiumAnalytics.tsx` | Replace with redirect to `/analytics` |
| Modify | `src/app/components/premium/PremiumGate.tsx` | amber spinner → violet |
| Modify | `src/app/components/premium/PremiumUpsell.tsx` | "Premium" → "Pro" strings, amber → violet gradient/button |
| Modify | `src/app/routes.tsx` | `/premium` → `<Navigate to="/analytics" />` |

---

## Task 1: Create `ProUpsellCompact.tsx`

**Files:**
- Create: `src/app/components/premium/ProUpsellCompact.tsx`

This is the embedded upsell that appears in the Pro tab for non-subscribers. It's a self-contained card — not a full-screen page. It uses the same DB write as `PremiumUpsell` to activate Pro.

- [ ] **Step 1: Create the file**

```tsx
import { useState } from 'react';
import { motion } from 'motion/react';
import {
  Crown, Loader2, TrendingUp, BarChart2, Heart, Sparkles,
  Calendar, SlidersHorizontal, Activity, AlertTriangle,
  Wallet, Lightbulb, MessageCircle, Coffee, Target, Flag,
  CalendarDays, Check,
} from 'lucide-react';
import { db } from '../../../db/db';

const FEATURES = [
  { icon: TrendingUp,        label: 'ML-Прогноз',      color: 'text-purple-500',  bg: 'bg-purple-50 dark:bg-purple-950/50'   },
  { icon: BarChart2,         label: 'Год к году',       color: 'text-blue-500',    bg: 'bg-blue-50 dark:bg-blue-950/50'       },
  { icon: Heart,             label: 'Health Score',     color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/50' },
  { icon: Sparkles,          label: 'AI-Инсайты',       color: 'text-amber-500',   bg: 'bg-amber-50 dark:bg-amber-950/50'     },
  { icon: Calendar,          label: 'Heatmap',          color: 'text-orange-500',  bg: 'bg-orange-50 dark:bg-orange-950/50'   },
  { icon: SlidersHorizontal, label: 'What-If',          color: 'text-cyan-500',    bg: 'bg-cyan-50 dark:bg-cyan-950/50'       },
  { icon: Activity,          label: 'Тренды',           color: 'text-indigo-500',  bg: 'bg-indigo-50 dark:bg-indigo-950/50'   },
  { icon: AlertTriangle,     label: 'Детектор проблем', color: 'text-red-500',     bg: 'bg-red-50 dark:bg-red-950/50'         },
  { icon: Wallet,            label: 'Прогноз баланса',  color: 'text-teal-500',    bg: 'bg-teal-50 dark:bg-teal-950/50'       },
  { icon: Lightbulb,         label: 'План роста',       color: 'text-yellow-500',  bg: 'bg-yellow-50 dark:bg-yellow-950/50'   },
  { icon: MessageCircle,     label: 'AI-Чат',           color: 'text-violet-500',  bg: 'bg-violet-50 dark:bg-violet-950/50'   },
  { icon: Coffee,            label: 'Привычки',         color: 'text-rose-500',    bg: 'bg-rose-50 dark:bg-rose-950/50'       },
  { icon: CalendarDays,      label: 'Дни недели',       color: 'text-sky-500',     bg: 'bg-sky-50 dark:bg-sky-950/50'         },
  { icon: Target,            label: 'Бюджет vs Факт',   color: 'text-pink-500',    bg: 'bg-pink-50 dark:bg-pink-950/50'       },
  { icon: Flag,              label: 'Прогноз целей',    color: 'text-lime-600',    bg: 'bg-lime-50 dark:bg-lime-950/50'       },
];

const HIGHLIGHTS = ['Офлайн', 'Локально', 'Раз и навсегда'];

export const ProUpsellCompact = () => {
  const [activating, setActivating] = useState(false);

  const handleActivate = async () => {
    setActivating(true);
    try {
      await db.settings.put({ key: 'premium', value: true });
      window.location.reload();
    } catch {
      setActivating(false);
    }
  };

  return (
    <div className="pb-6">
      {/* Hero */}
      <div
        className="mx-0 rounded-2xl px-5 py-6 text-white text-center mb-4"
        style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 18 }}
          className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-3 shadow-xl"
        >
          <Crown className="w-7 h-7 text-white" />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <h2 className="text-2xl font-bold tracking-tight mb-1">Pro</h2>
          <p className="text-white/80 text-sm mb-3">Глубокая аналитика вашего бюджета</p>
          <div className="flex flex-wrap justify-center gap-1.5">
            {HIGHLIGHTS.map(h => (
              <div key={h} className="flex items-center gap-1 bg-white/15 rounded-full px-2.5 py-0.5 text-xs font-medium">
                <Check className="w-3 h-3" />
                {h}
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Features grid */}
      <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-2 px-1">
        15 функций включено
      </p>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {FEATURES.map((f, i) => (
          <motion.div
            key={f.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 + i * 0.02 }}
            className="bg-card border border-border rounded-xl p-2.5 flex flex-col items-start gap-1.5"
          >
            <div className={`w-7 h-7 rounded-lg ${f.bg} flex items-center justify-center flex-shrink-0`}>
              <f.icon className={`w-3.5 h-3.5 ${f.color}`} />
            </div>
            <div className="text-[11px] font-semibold leading-tight">{f.label}</div>
          </motion.div>
        ))}
      </div>

      {/* CTA */}
      <motion.button
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        onClick={handleActivate}
        disabled={activating}
        className="w-full py-3.5 rounded-2xl font-bold text-base text-white shadow-lg disabled:opacity-60 active:scale-[0.98] transition-transform"
        style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}
      >
        {activating ? (
          <span className="inline-flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Активируем…
          </span>
        ) : (
          <span className="inline-flex items-center justify-center gap-2">
            <Crown className="w-4 h-4" />
            Получить Pro
          </span>
        )}
      </motion.button>
      <p className="text-xs text-muted-foreground text-center mt-1.5">
        Тестовый режим — мгновенная активация
      </p>
    </div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add src/app/components/premium/ProUpsellCompact.tsx
git commit -m "feat: add ProUpsellCompact for embedded pro tab upsell"
```

---

## Task 2: Update `PremiumGate.tsx` and `PremiumUpsell.tsx` colors and strings

**Files:**
- Modify: `src/app/components/premium/PremiumGate.tsx`
- Modify: `src/app/components/premium/PremiumUpsell.tsx`

- [ ] **Step 1: Fix `PremiumGate.tsx` — spinner color amber → violet**

In `src/app/components/premium/PremiumGate.tsx`, replace the loading spinner div:

```tsx
// OLD
<div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />

// NEW
<div className="w-8 h-8 rounded-full border-2 border-violet-600 border-t-transparent animate-spin" />
```

- [ ] **Step 2: Fix `PremiumUpsell.tsx` — "Premium" → "Pro" and amber → violet**

In `src/app/components/premium/PremiumUpsell.tsx`:

Replace the hero section's h1 text:
```tsx
// OLD
<h1 className="text-3xl font-bold tracking-tight mb-2">Premium</h1>

// NEW
<h1 className="text-3xl font-bold tracking-tight mb-2">Pro</h1>
```

Replace the CTA button content:
```tsx
// OLD
<Crown className="w-5 h-5" />
Получить Premium

// NEW
<Crown className="w-5 h-5" />
Получить Pro
```

- [ ] **Step 3: Commit**

```bash
git add src/app/components/premium/PremiumGate.tsx src/app/components/premium/PremiumUpsell.tsx
git commit -m "feat: rename Premium→Pro, amber→violet in gate and upsell"
```

---

## Task 3: Update `Analytics.tsx` — add tab switcher and Pro content

**Files:**
- Modify: `src/app/screens/Analytics.tsx`

The tab switcher lives in the header. Switching to Pro either shows inline Pro content (4 sub-tabs from PremiumAnalytics) or `ProUpsellCompact`. The Pro section reuses `PredictiveTab`, `ComparativeTab`, `HealthTab`, `AIInsightsPanel`, and the `PERIODS` constant exactly as in `PremiumAnalytics.tsx`.

- [ ] **Step 1: Add imports at the top of `Analytics.tsx`**

Add these imports below the existing ones:
```tsx
import { TrendingUp, BarChart2, Heart } from 'lucide-react';
import { usePremium } from '../hooks/usePremium';  // already imported — skip if duplicate
import { ProUpsellCompact } from '../components/premium/ProUpsellCompact';
import { PredictiveTab } from '../components/premium/PredictiveTab';
import { ComparativeTab } from '../components/premium/ComparativeTab';
import { HealthTab } from '../components/premium/HealthTab';
import { AIInsightsPanel } from '../components/premium/AIInsightsPanel';
import { PERIODS, type Period } from '../../lib/period';
```

Note: `usePremium` is already imported in the existing file — do not duplicate it.

- [ ] **Step 2: Add tab and pro sub-tab state inside the `Analytics` component**

After the existing state declarations (around line 40), add:
```tsx
const [mainTab, setMainTab] = useState<'basic' | 'pro'>('basic');
const [proTab, setProTab] = useState<'predictive' | 'comparative' | 'health' | 'ai'>('predictive');
const [proPeriod, setProPeriod] = useState<Period>('1m');
```

- [ ] **Step 3: Replace the header block in the JSX**

Find this block (starts around line 166):
```tsx
{/* Header */}
<div className="px-5 pt-4 pb-4">
  <h1 className="text-xl font-bold tracking-[-0.01em] mb-4">Аналитика</h1>
  ...
  {/* Premium Banner */}
  <button
    onClick={() => navigate('/premium')}
    ...
  >
    ...
  </button>
</div>
```

Replace the entire header `<div className="px-5 pt-4 pb-4">` block with:
```tsx
{/* Header */}
<div className="px-5 pt-4 pb-3">
  <h1 className="text-xl font-bold tracking-[-0.01em] mb-3">Аналитика</h1>

  {/* Main tab switcher: Базовая / Pro */}
  <div className="flex gap-1 p-1 bg-muted rounded-xl mb-3">
    <button
      onClick={() => setMainTab('basic')}
      className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
        mainTab === 'basic'
          ? 'bg-white dark:bg-card shadow-sm text-foreground'
          : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      Базовая
    </button>
    <button
      onClick={() => setMainTab('pro')}
      className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
        mainTab === 'pro'
          ? 'bg-white dark:bg-card shadow-sm text-violet-600'
          : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      <Crown className={`w-3.5 h-3.5 ${mainTab === 'pro' ? 'text-violet-600' : ''}`} />
      Pro
    </button>
  </div>

  {/* Period picker — only for basic tab */}
  {mainTab === 'basic' && (
    <button
      onClick={() => setIsPeriodPickerOpen(true)}
      className="w-full flex items-center justify-between px-5 py-3 bg-card rounded-xl border border-border shadow-xs hover:shadow-sm transition-shadow"
    >
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-muted-foreground" />
        <span className="font-medium text-sm">{periodLabel}</span>
      </div>
      <span className="text-xs text-muted-foreground">Изменить</span>
    </button>
  )}
</div>
```

Note: `Crown` is already imported in the existing file from lucide-react.

- [ ] **Step 4: Wrap all existing basic-tab content in a conditional**

After the closing `</div>` of the new header block, find the first `<motion.section>` (Summary Cards). Wrap everything from there down to (but not including) the `<BottomSheet>`) inside:

```tsx
{mainTab === 'basic' && (
  <>
    {/* ...all existing motion.section blocks... */}
  </>
)}
```

And after that closing `</>}`, add the Pro tab content:

```tsx
{mainTab === 'pro' && (
  <div className="px-4 pt-2">
    {isPremium ? (
      <>
        {/* Pro period picker */}
        <div className="flex gap-1 p-1 bg-muted/60 rounded-xl mb-2">
          {PERIODS.map(p => (
            <button
              key={p.key}
              onClick={() => setProPeriod(p.key)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                proPeriod === p.key
                  ? 'bg-white dark:bg-card shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Pro sub-tabs */}
        <div className="flex gap-1 mb-4">
          {([
            { key: 'predictive',  Icon: TrendingUp, label: 'Прогнозы'  },
            { key: 'comparative', Icon: BarChart2,  label: 'Сравнения' },
            { key: 'health',      Icon: Heart,      label: 'Здоровье'  },
            { key: 'ai',          Icon: Sparkles,   label: 'AI'        },
          ] as const).map(({ key, Icon, label }) => {
            const active = proTab === key;
            return (
              <button
                key={key}
                onClick={() => setProTab(key)}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl text-[11px] font-semibold transition-all ${
                  active
                    ? 'bg-violet-600/10 text-violet-600 dark:text-violet-400'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-violet-600 dark:text-violet-400' : ''}`} />
                {label}
              </button>
            );
          })}
        </div>

        {/* Pro tab content */}
        {proTab === 'predictive'  && <PredictiveTab  period={proPeriod} />}
        {proTab === 'comparative' && <ComparativeTab period={proPeriod} />}
        {proTab === 'health'      && <HealthTab      period={proPeriod} />}
        {proTab === 'ai'          && <AIInsightsPanel />}
      </>
    ) : (
      <ProUpsellCompact />
    )}
  </div>
)}
```

- [ ] **Step 5: Remove the `navigate` import usage for `/premium` if it's now unused**

Check if `useNavigate` / `navigate` is still used anywhere in `Analytics.tsx`. If the only usage was the old "Premium Banner" button (which we removed), remove the `useNavigate` import and the `const navigate = useNavigate();` line.

- [ ] **Step 6: Verify the file compiles**

Run:
```bash
cd C:/Users/alexi/Documents/Finly && npx tsc --noEmit 2>&1 | head -40
```

Expected: no errors (or only pre-existing unrelated errors).

- [ ] **Step 7: Commit**

```bash
git add src/app/screens/Analytics.tsx
git commit -m "feat: add basic/pro tab switcher to analytics screen"
```

---

## Task 4: Update `PremiumAnalytics.tsx` to redirect, update `routes.tsx`

**Files:**
- Modify: `src/app/screens/PremiumAnalytics.tsx`
- Modify: `src/app/routes.tsx`

The standalone Pro screen is no longer needed since the content lives in the Analytics tab. Anyone hitting `/premium` gets redirected to `/analytics`.

- [ ] **Step 1: Replace `PremiumAnalytics.tsx` with a redirect**

Replace the entire file content with:
```tsx
import { Navigate } from 'react-router-dom';

export const PremiumAnalytics = () => <Navigate to="/analytics" replace />;
```

- [ ] **Step 2: Verify `routes.tsx` still maps `/premium` to `PremiumAnalytics`**

The route already exists in `routes.tsx`:
```tsx
{ path: 'premium', lazy: lazyRoute(() => import('./screens/PremiumAnalytics'), 'PremiumAnalytics') },
```

This is fine as-is — the lazy-loaded component now just redirects. No change needed in routes.tsx.

- [ ] **Step 3: Verify the file compiles**

```bash
cd C:/Users/alexi/Documents/Finly && npx tsc --noEmit 2>&1 | head -40
```

- [ ] **Step 4: Commit**

```bash
git add src/app/screens/PremiumAnalytics.tsx
git commit -m "feat: redirect /premium to /analytics, standalone screen removed"
```

---

## Task 5: Manual verification

- [ ] **Step 1: Start the dev server**

```bash
cd C:/Users/alexi/Documents/Finly && npm run dev
```

- [ ] **Step 2: Test as free user (no Pro)**

1. Open `/analytics`
2. Confirm tab switcher shows "Базовая" | "Pro" (with Crown icon)
3. Basic tab: all existing charts render, period picker works
4. Pro tab: `ProUpsellCompact` appears — violet hero, feature grid, "Получить Pro" button
5. Click "Получить Pro" → activates, page reloads

- [ ] **Step 3: Test as Pro user**

1. After activation, open `/analytics`, click Pro tab
2. Period picker + 4 sub-tabs (Прогнозы/Сравнения/Здоровье/AI) appear
3. All 4 sub-tabs render their content without errors
4. Switching period updates the content

- [ ] **Step 4: Test redirect**

Navigate to `/premium` — should redirect to `/analytics` without error.

- [ ] **Step 5: Check colors**

- No amber/gold on Pro-related elements (Crown icon, tab active state, button gradient)
- Active Pro tab: violet text/ring
- "Получить Pro" button: violet gradient

- [ ] **Step 6: Commit if any last fixes were needed**

```bash
git add -p
git commit -m "fix: polish pro tab UI after manual verification"
```
