# Finly AI / ML — Полная техническая документация

> Версия документа: 1.0  
> Дата: 28 июня 2026  
> Модель: Finly Classifier Runtime v4.3  
> Платформа: TensorFlow.js 4.22 / WebGL / WASM fallback  
> Автор документации: Community Contributor

---

## Содержание

1. [Обзор архитектуры](#1-обзор-архитектуры)
2. [Finly Classifier v4.3](#2-finly-classifier-v43)
3. [5-уровневый пайплайн классификации](#3-5-уровневый-пайплайн-классификации)
4. [Признаковое пространство — 24 features](#4-признаковое-пространство--24-features)
5. [TF-IDF векторизация](#5-tf-idf-векторизация)
6. [Merchant Rules Engine](#6-merchant-rules-engine)
7. [ML-модель: Dual model архитектура](#7-ml-модель-dual-model-архитектура)
8. [MC Dropout и оценка неуверенности](#8-mc-dropout-и-оценка-неуверенности)
9. [Пороги уверенности / per-class thresholds](#9-пороги-уверенности--per-class-thresholds)
10. [LRU cache и user overrides](#10-lru-cache-и-user-overrides)
11. [Офлайн AI-чат: intent-роутер](#11-офлайн-ai-чат-intent-роутер)
12. [Онлайн AI-чат: OpenRouter proxy](#12-онлайн-ai-чат-openrouter-proxy)
13. [Context Builder — финансовый снапшот](#13-context-builder--финансовый-снапшот)
14. [Безопасность API-ключа](#14-безопасность-api-ключа)
15. [Обучение и fine-tuning](#15-обучение-и-fine-tuning)
16. [Телеметрия и drift detection](#16-телеметрия-и-drift-detection)
17. [Производительность](#17-производительность)
18. [AI-инсайты и Pro-модуль](#18-ai-инсайты-и-pro-модуль)
19. [Natural Language Parsing транзакций](#19-natural-language-parsing-транзакций)
20. [Receipt Scanner: OCR + QR](#20-receipt-scanner-ocr--qr)
21. [What-If симулятор и прогнозы](#21-what-if-симулятор-и-прогнозы)
22. [Financial Health Score](#22-financial-health-score)
23. [Файловая структура модели](#23-файловая-структура-модели)
24. [Runtime Config](#24-runtime-config)
25. [API reference](#25-api-reference)
26. [Тестирование](#26-тестирование)
27. [Деплой и версионирование](#27-деплой-и-версионирование)
28. [Roadmap](#28-roadmap)
29. [FAQ](#29-faq)
30. [Приложение: примеры кода](#30-приложение-примеры-кода)

---

## 1. Обзор архитектуры

Finly — это офлайн-first PWA для управления личными финансами с гибридным AI-слоем.

```
┌─────────────────────────────────────────────────────────────┐
│                        Finly PWA                            │
│  React 18 + TypeScript 5.4 + Vite 6.3 + Zustand            │
├──────────────┬──────────────────┬───────────────────────────┤
│  UI Layer    │  AI Layer        │  Data Layer               │
│  shadcn/ui   │  TF.js 4.22      │  IndexedDB / Dexie 3.2    │
│  Recharts    │  OpenRouter      │  3 schema versions        │
│  Radix UI    │  Local NLP       │                           │
└──────────────┴──────────────────┴───────────────────────────┘
```

AI-подсистема состоит из двух независимых контуров:

**A. Локальная ML-классификация (100% офлайн)**

- `FinlyClassifier` — `src/lib/classifier/finly_runtime.ts` (1219 строк)
- TensorFlow.js, WebGL backend
- 93% accuracy на валидации
- latency: 0.1ms (cache) → 60ms (MC Dropout)

**B. Гибридный AI-чат**

- Онлайн: OpenRouter API через Vercel Function `/api/ai-chat.ts`
- Офлайн: intent-роутер `chatContext.ts` — 17 интентов, fully local
- Автоматический fallback: онлайн → офлайн за <50ms

Ключевые принципы:

1. **Privacy-first.** Все финансовые данные — только в IndexedDB. Модель работает локально.
2. **Offline-first.** Базовая функциональность без сети.
3. **Explainable AI.** Каждое предсказание сопровождается `explanation[]` — топ-5 фич.
4. **Uncertainty aware.** MC Dropout даёт mean±std, не просто softmax.
5. **Secure proxy.** API-ключ OpenRouter никогда не покидает сервер.

---

## 2. Finly Classifier v4.3

`FinlyClassifier` — основной класс в `src/lib/classifier/finly_runtime.ts`.

История версий:

| Версия | Accuracy | Features | Модель |
|--------|----------|----------|--------|
| v1.0 | 42% | 5 numeric | single dense |
| v2.0 | 54% | 5 + TF-IDF char | TF.js |
| v3.0 | 71% | + word ngrams | dropout 0.3 |
| v4.0 | 84% | merchant lookup | dual model |
| **v4.3** | **93%** | **24 features** | **MC Dropout** |

Ключевые улучшения v4.3 over v4.0:

- Dual model: `model_predict` (fast path, 1 pass) + `model_train_mc` (MC dropout, 30 passes)
- Merchant features: 19 extra numeric inputs из `merchant_rules.json`
- Numeric input расширен до 24 признаков (было 5)
- `numeric_stats.json` z-score нормализация всех numeric features
- Config из `runtime_config.json` (manifest.json больше не требуется)
- Test accuracy: 93% (up from 54% in v2)

Поддерживаемые категории (11 классов):

```
Expense:
  Еда, Продукты, Транспорт, Шопинг, Коммунальные,
  Здоровье, Развлечения, Аренда
Income:
  Зарплата, Инвестиции
Fallback:
  Uncategorized
```

Типы:

```typescript
export type Category =
  | 'Еда' | 'Продукты' | 'Транспорт' | 'Шопинг' | 'Коммунальные'
  | 'Здоровье' | 'Развлечения' | 'Аренда' | 'Зарплата' | 'Инвестиции'
  | 'Uncategorized';

export type TxType = 'Income' | 'Expense';

export type ClassifySource =
  | 'cache'
  | 'user_override'
  | 'rule'
  | 'ml'
  | 'low_confidence';
```

Результат классификации:

```typescript
export interface ClassifyResult {
  category:       Category;
  type:           TxType;
  confidence:     number;      // mean MC probability
  uncertainty:    number;      // MC std — эпистемическая неуверенность
  source:         ClassifySource;
  top3:           Array<{ category: Category; prob: number; std: number }>;
  explanation?:   string[];    // топ-5 фич
  rule_id?:       string;
  model_version?: string;
  latency_ms:     number;
}
```

---

## 3. 5-уровневый пайплайн классификации

Приоритет сверху вниз — первый сработавший возвращает результат.

```
INPUT: "кофе 450 рублей в Старбаксе утром"
  │
  ▼
┌────────────────────────────────────────────┐
│ 1. LRU CACHE                               │
│    exact string match, O(1)                │
│    ~0.05ms, hit rate ~35%                  │
└─────────┬──────────────────────────────────┘
          │ miss
          ▼
┌────────────────────────────────────────────┐
│ 2. USER OVERRIDES (IndexedDB)              │
│    description_normalized → category       │
│    ~1ms, user corrections persist          │
└─────────┬──────────────────────────────────┘
          │ miss
          ▼
┌────────────────────────────────────────────┐
│ 3. RULE ENGINE                             │
│    MCC + fuzzy merchant match              │
│    Levenshtein ≤3, transliteration         │
│    ~0.1ms                                  │
└─────────┬──────────────────────────────────┘
          │ miss
          ▼
┌────────────────────────────────────────────┐
│ 4. ML (MC DROPOUT)                         │
│    TF.js, N=30 forward passes              │
│    mean ± std, per-class thresholds        │
│    ~30-60ms                                │
└─────────┬──────────────────────────────────┘
          │ low confidence
          ▼
┌────────────────────────────────────────────┐
│ 5. LOW CONFIDENCE FALLBACK                 │
│    Uncategorized + top-3                   │
│    ~0ms                                    │
└────────────────────────────────────────────┘
```

Фрагмент основного метода:

```typescript
async classify(
  description: string,
  amount?: number,
  timestamp?: number
): Promise<ClassifyResult> {
  const t0 = performance.now();
  const norm = normalizeText(description);

  // 1. cache
  const cached = this.cache.get(norm);
  if (cached) return { ...cached, latency_ms: performance.now() - t0, source: 'cache' };

  // 2. user_override
  const override = await this.db.user_overrides.get(norm);
  if (override) { /* ... return */ }

  // 3. rule engine
  const ruleHit = matchRule(norm, this.rules);
  if (ruleHit) { /* ... return */ }

  // 4. ML fast path
  const fast = await this.modelPredict(norm, amount, timestamp);
  if (fast.confidence > perClassThreshold[fast.category]) {
    return { ...fast, source: 'ml', latency_ms: performance.now() - t0 };
  }

  // 4b. MC Dropout uncertainty
  const mc = await mcDropoutPredict(..., 30);
  // margin + uncertainty checks
  // ...

  // 5. fallback
  return { category: 'Uncategorized', source: 'low_confidence', ... };
}
```

---

## 4. Признаковое пространство — 24 features

v4.3 расширила numeric-вход с 5 до 24 признаков.

Группы признаков:

**A. Базовые (5):**

1. `amount_log` — log1p(amount), нормализован
2. `hour_sin`, `hour_cos` — циклическое кодирование времени
3. `dow_sin`, `dow_cos` — день недели

**B. Merchant features (19):** из `merchant_rules.json` lookup

```
merchant_score_start ... merchant_score_end  → 11 классов
merchant_feature_start:
  - merchant_match_length
  - merchant_tokens
  - merchant_generic_flag
  - merchant_score_weight
  - merchant_conflict_count
  - ...
```

Итого: 5 + 19 = 24.

Z-score нормализация:

```json
// numeric_stats.json
{
  "feature_names": [
    "amount_log", "hour_sin", "hour_cos", "dow_sin", "dow_cos",
    "m_len", "m_tokens", "m_generic", "m_weight", ...
  ],
  "mean": [ ... 24 числа ... ],
  "std":  [ ... 24 числа ... ]
}
```

В runtime:

```typescript
function zNormalize(vec: number[], stats: NumericStats): Float32Array {
  return Float32Array.from(
    vec.map((v, i) => (v - stats.mean[i]) / (stats.std[i] || 1))
  );
}
```

Текстовая ветка отдельно:

- char_wb TF-IDF: ngram_range [3,5], ~3200 фич после маски
- word TF-IDF: ngram_range [1,2], ~1800 фич
- concat_order: ['char','word']
- feature mask: отбор top-K по gain

Итоговый инпут модели:

```
text_vec:  ~5000-dim (masked TF-IDF)
numeric_vec: 24-dim  (z-scored)
→ concatenate → Dense(256) → Dropout(0.4) → Dense(128) → Dropout(0.3) → 11-way softmax
```

---

## 5. TF-IDF векторизация

Байт-точная реализация sklearn в TypeScript.

Char_wb tokenizer:

```typescript
function tokenizeCharWb(text: string, nMin: number, nMax: number): string[] {
  const grams: string[] = [];
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const padded = ' ' + word + ' ';
    for (let n = nMin; n <= nMax; n++) {
      for (let i = 0, max = padded.length - n; i <= max; i++) {
        grams.push(padded.slice(i, i + n));
      }
    }
  }
  return grams;
}
```

Word tokenizer с Unicode:

```typescript
const WORD_RE = /[\p{L}\p{N}_]+/gu;
function tokenizeWord(text: string, nMin: number, nMax: number): string[] {
  const words = text.match(WORD_RE) ?? [];
  // n-grams 1..2
  ...
}
```

TF-IDF с sublinear_tf:

```
tf = 1 + log(cnt)    if sublinear_tf else cnt
tfidf = tf * idf[idx]
L2 normalize
```

Маскирование:

```typescript
function applyMask(vec: Float32Array, mask: boolean[]): Float32Array {
  const out: number[] = [];
  for (let i = 0; i < mask.length; i++) if (mask[i]) out.push(vec[i]);
  return new Float32Array(out);
}
```

Это позволяет хранить полный vocab (~12000), но подавать в модель только top informative features (~5000).

---

## 6. Merchant Rules Engine

До ML — быстрый rule-based слой.

Структура правила (`merchant_rules.json`):

```json
{
  "category": "Еда",
  "alias": "Старбакс",
  "alias_norm": "старбакс",
  "length": 8,
  "tokens": 1,
  "generic": false,
  "score_weight": 0.92,
  "conflict_categories": ["Продукты"]
}
```

Матчинг:

1. Exact substring
2. Fuzzy: Levenshtein ≤ 3
3. Transliteration: кириллица ↔ латиница

```typescript
const TRANSLIT: Record<string,string> = {
  а:'a', б:'b', в:'v', г:'g', д:'d', е:'e', ё:'e', ж:'zh',
  з:'z', и:'i', й:'y', к:'k', л:'l', м:'m', н:'n', о:'o',
  п:'p', р:'r', с:'s', т:'t', у:'u', ф:'f', х:'h', ц:'c',
  ч:'ch', ш:'sh', щ:'sch', ъ:'', ы:'y', ь:'', э:'e', ю:'yu', я:'ya'
};

function transliterate(text: string): string { ... }

function levenshtein(a: string, b: string, maxDist = 3): number { ... }
```

Merchant features для ML вычисляются так:

```typescript
function computeMerchantFeatures(
  norm: string,
  merchantRules: MerchantRule[],
  catToIdx: Map<string, number>,
  numClasses: number
): number[] {
  // score per class 0..10
  const scores = new Float32Array(numClasses);
  // extra merchant meta features
  // ...
  return [...scores, ...meta];
}
```

Это даёт модели сильный сигнал: если “пятёрочка” найдена в тексте — почти наверняка “Продукты”.

---

## 7. ML-модель: Dual model архитектура

Две модели TensorFlow.js:

**model_predict** — инференс без dropout, быстрый путь.

```
Input: [text_vec, numeric_vec]
→ Dense 256, relu
→ Dense 128, relu
→ Dense 11, softmax
Latency: ~8-12ms
```

**model_train_mc** — та же архитектура, но с включённым dropout на инференсе.

```
→ Dense 256, relu, Dropout 0.4 (active at inference)
→ Dense 128, relu, Dropout 0.3 (active)
→ Dense 11, softmax
```

MC Dropout: 30 стохастических проходов → распределение предсказаний.

Зачем dual?

- 85% запросов закрываются fast path (high confidence, low latency 10ms).
- Только спорные случаи идут в MC (30-60ms).
- Средний p95 latency: ~18ms.

Загрузка моделей:

```typescript
const [predictModel, mcModel] = await Promise.all([
  tf.loadLayersModel(base + 'model_predict/model.json'),
  tf.loadLayersModel(base + 'model_train_mc/model.json'),
]);
```

Размер ассетов:

- model_predict: ~1.8 MB
- model_train_mc: ~1.8 MB
- vocab char: 420 KB
- vocab word: 310 KB
- merchant_rules.json: 84 KB
- numeric_stats.json: 2 KB
- runtime_config.json: 1.5 KB
- итого ~4.4 MB, кэшируется Service Worker (Workbox, CacheFirst)

---

## 8. MC Dropout и оценка неуверенности

MC Dropout — Bayesian approximation (Gal & Ghahramani, 2016).

```typescript
async function mcDropoutPredict(
  model: tf.LayersModel,
  textVec: Float32Array,
  numericVec: Float32Array,
  passes = 30
): Promise<{ mean: Float32Array; std: Float32Array }> {
  const probs: number[][] = [];
  for (let i = 0; i < passes; i++) {
    const pred = model.predict([textT, numT]) as tf.Tensor;
    probs.push(Array.from(await pred.data()));
    pred.dispose();
  }
  // mean / std per class
  const mean = new Float32Array(numClasses);
  const std  = new Float32Array(numClasses);
  for (let c = 0; c < numClasses; c++) {
    const col = probs.map(p => p[c]);
    mean[c] = col.reduce((a,b)=>a+b,0) / passes;
    const variance = col.reduce((s,v)=>s+(v-mean[c])**2,0) / passes;
    std[c] = Math.sqrt(variance);
  }
  return { mean, std };
}
```

Решение о принятии:

```
best = argmax(mean)
second = second_max(mean)
margin = mean[best] - mean[second]
uncertainty = std[best]

accept if:
  mean[best] >= per_class_threshold[best]
  AND margin >= margin_threshold (default 0.12)
  AND uncertainty <= uncertainty_threshold (default 0.18)
  AND conditions_met >= min_conditions_to_accept (default 2)
```

unc_margin_relax: если margin очень высокий (>0.35), можно ослабить uncertainty до uncertainty_threshold * 1.5

Это снижает false positives на редких категориях.

---

## 9. Пороги уверенности / per-class thresholds

Глобальный threshold 0.55, но per-class калибровка:

```json
// runtime_config.json
{
  "per_class_thresholds": {
    "Продукты": 0.48,
    "Транспорт": 0.50,
    "Еда": 0.52,
    "Аренда": 0.42,
    "Зарплата": 0.40,
    "Коммунальные": 0.55,
    "Здоровье": 0.60,
    "Развлечения": 0.58,
    "Шопинг": 0.57,
    "Инвестиции": 0.62
  },
  "default_class_threshold": 0.55,
  "min_class_threshold": 0.40,
  "max_class_threshold": 0.70
}
```

Логика: частые “Продукты” — низкий порог, редкие “Инвестиции” — высокий, чтобы не было ложных срабатываний.

Калибровка на валидационной выборке: максимизация F1 при precision ≥ 0.90.

Другие параметры:

```json
{
  "mc_dropout_passes": 30,
  "uncertainty_mode": "epistemic",
  "uncertainty_threshold": 0.18,
  "uncertainty_quantile_on_val": 0.85,
  "margin_threshold": 0.12,
  "unc_margin_relax": 1.5,
  "min_conditions_to_accept": 2
}
```

---

## 10. LRU cache и user overrides

**LRUCache** — in-memory, maxSize = 512

```typescript
class LRUCache<K, V> {
  private map = new Map<K, V>();
  get(key: K): V | undefined {
    const val = this.map.get(key);
    if (val === undefined) return undefined;
    this.map.delete(key);
    this.map.set(key, val); // move to end
    return val;
  }
  set(key: K, val: V): void {
    if (this.map.has(key)) this.map.delete(key);
    else if (this.map.size >= this.maxSize) {
      this.map.delete(this.map.keys().next().value!);
    }
    this.map.set(key, val);
  }
}
```

Hit rate в проде ~35%, latency ~0.05ms.

**User overrides** — IndexedDB таблица:

```typescript
export interface UserOverride {
  description_normalized: string; // PK
  category: Category;
  type: TxType;
  updated_at: number;
  match_count: number;
}
```

Когда пользователь исправляет категорию в UI:

```typescript
await db.user_overrides.put({
  description_normalized: normalize(description),
  category: corrected,
  type,
  updated_at: Date.now(),
  match_count: 1
});
```

При повторном `classify()` — override срабатывает на уровне 2, до rule/ML. Это персонализация без переобучения.

Feedback также пишется в `feedback` таблицу — для будущего fine-tuning.

---

## 11. Офлайн AI-чат: intent-роутер

Файл: `src/app/hooks/chatContext.ts` (~350 строк).

Архитектура:

```
user text
  → extractPeriod()  // "в прошлом месяце", "за неделю"
  → shift detection  // "а за прошлый?"
  → INTENTS loop     // regex patterns
  → analytics DB query
  → answer + suggestions
```

17 интентов (в порядке приоритета):

| id | Триггеры | Источник данных |
|----|----------|-----------------|
| help | помощь, что умеешь | HELP_TEXT |
| recurring | ближайшие платежи, подписки | getRecurringUpcoming |
| income-pattern | когда зарплата | getIncomePattern |
| anomalies | аномальные, странные траты | getAnomalousTransactions |
| day-of-week | в какой день трачу | getSpendByDayOfWeek |
| advice | как сэкономить | getExpensesByCategory + getSavingsRate |
| largest | самые крупные | getLargestTransactions |
| daily-avg | средний в день | getAverageDailySpend |
| goals-timeline | когда накоплю | getGoalsProgress + savingsRate |
| goals | цели, накопление | getGoalsProgress |
| budget | бюджет | getAllBudgetsProgress |
| forecast | прогноз | getMonthForecast |
| compare | сравнить, прошлый | getBalanceByPeriod MoM |
| savings | норма сбережений | getSavingsRate |
| balance | баланс, остаток | getBalanceByPeriod |
| income | доход, зарплата | getBalanceByPeriod |
| category | / .+ / fallback | findCategoryByName |
| expenses | расход, трата | getExpensesByCategory |

Контекст диалога:

```typescript
export interface ChatCtx {
  lastTopic?: string;
  lastPeriod?: Period;
  lastCategoryId?: string;
  lastCategoryName?: string;
}
```

Follow-up: “А за прошлый месяц?” — детектируется shift:

```typescript
const isShift = /^(а|и)?\s*(в|за)?\s*прошл|а раньше/.test(q);
if (isShift && ctx.lastTopic && ctx.lastPeriod) {
  const shifted = shiftPeriodBack(ctx.lastPeriod);
  // рекурсивно answerQuery с shifted периодом
}
```

Suggestions: после каждого ответа — 3 релевантных follow-up pills.

Пример ответа intent `advice`:

```
Ваша главная статья расходов — «Еда»: 18 450 ₽ (34% всех трат).
• Сократив её на 10% → сэкономите ~1 845 ₽/мес
• На 20% → ~3 690 ₽/мес

Сейчас норма сбережений: 12%. Рекомендуемый минимум — 20%.

Другие крупные категории: Транспорт (8 200 ₽), Продукты (6 900 ₽).
```

Весь intent-движок — ~12 KB gzipped, работает <5ms, zero network.

---

## 12. Онлайн AI-чат: OpenRouter proxy

Клиент: `src/services/ai/aiClient.ts`

```typescript
const PROXY_URL = '/api/ai-chat';

export async function chatCompletion(
  systemPrompt: string,
  messages: AIMessage[],
): Promise<string> {
  const res = await fetch(PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ systemPrompt, messages }),
  });
  // ...
  return data.content;
}
```

Никакого API-ключа на клиенте.

Сервер: `api/ai-chat.ts` — Vercel Function (Node).

Валидация:

- method === POST
- messages.length ≤ 50
- each content.length ≤ 10000
- systemPrompt ≤ 4000 chars

Проксирование:

```typescript
const upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`, // process.env.OPENROUTER_API_KEY
    'HTTP-Referer': 'https://finly.app',
    'X-Title': 'Finly',
  },
  body: JSON.stringify({
    model: process.env.OPENROUTER_MODEL ?? 'openai/gpt-4o-mini',
    messages: [{ role: 'system', content: systemPrompt }, ...validMessages],
    temperature: 0.7,
    max_tokens: 800,
  }),
  signal: AbortSignal.timeout(8000)
});
```

Ошибки мапятся:

- upstream 401 → 500 “Upstream auth failed”
- upstream 429 → 503 “Upstream rate limit”
- timeout / network → 502 “Failed to reach upstream”

Клиентский хук `useAIChat.ts`:

```
try {
  online = await chatCompletion(systemPrompt, history)
  return online
} catch (e: AIClientError) {
  // fallback to answerQuery (offline)
  const offline = await answerQuery(userText, ctx)
  return offline.answer + "\n\n_офлайн-ответ_"
}
```

UI: `AIInsightsPanel.tsx` — bubble chat, suggestion pills, markdown-рендер, индикатор online/offline.

---

## 13. Context Builder — финансовый снапшот

`src/services/ai/contextBuilder.ts` — сборка system prompt с реальными данными пользователя.

```typescript
export async function buildFinancialSnapshot(): Promise<string> {
  const [balance, categories, budgets, goals, upcoming, savings] = await Promise.all([
    getBalanceByPeriod(monthStart, end),
    getExpensesByCategory(monthStart, end),
    getAllBudgetsProgress(monthStart, end),
    getGoalsProgress(),
    getRecurringUpcoming(30),
    getSavingsRate(monthStart, end),
  ]);
  // ...
}
```

Пример сгенерированного снапшота:

```
Финансовый профиль пользователя (июнь 2026):
Баланс: 42 800 ₽
Доходы за месяц: 185 000 ₽ | Расходы: 142 200 ₽
Норма сбережений: 23%
Топ категории расходов: Еда 38 400 ₽, Аренда 35 000 ₽, Транспорт 12 100 ₽, Продукты 9 800 ₽, Развлечения 7 600 ₽
Бюджеты: Еда 38400/40000 ₽ [warn], Транспорт 12100/15000 ₽ [ok], Развлечения 7600/5000 ₽ [over]
Цели накопления: "MacBook" 120 000/220 000 ₽ (55%), "Отпуск" 45 000/150 000 ₽ (30%)
Ближайшие платежи: Аренда 35 000 ₽ (через 3 дн.), Интернет 890 ₽ (завтра), Spotify 169 ₽ (сегодня)
```

Этот текст подставляется в systemPrompt для LLM:

```
Ты финансовый ассистент приложения Finly. Отвечай кратко и по делу на русском языке. Не придумывай цифры.

[финансовый снапшот выше]
```

LLM получает ground truth — не галлюцинирует суммы.

---

## 14. Безопасность API-ключа

Раньше: `VITE_OPENROUTER_API_KEY` — встраивался в JS-бандл, виден в DevTools → Sources.

Сейчас: `OPENROUTER_API_KEY` — только `process.env` на сервере Vercel.

Сравнение:

| | Старый подход | Новый прокси |
|---|---|---|
| Где ключ | JS bundle, public | Vercel env, server-only |
| Виден в DevTools | Да | Нет |
| Утечка при build | Да | Нет |
| Rate limit защита | Нет | Да (валидация, 8s timeout) |
| Модель переключаемая | Хардкод | ENV `OPENROUTER_MODEL` |

Настройка:

```bash
npm i -g vercel
vercel link
vercel env add OPENROUTER_API_KEY
# опционально:
vercel env add OPENROUTER_MODEL
npm run dev:full   # vercel dev = Vite + Function
```

---

## 15. Обучение и fine-tuning

Модель обучается офлайн (Python / TensorFlow), экспортируется в TF.js Layers format.

Тренировочный пайплайн (вне репозитория, кратко):

1. Сборка датасета: ~45k размеченных транзакций RU.
2. Предобработка: normalize, TF-IDF fit (sklearn), merchant lookup join.
3. Train/val/test: 70/15/15, стратификация по категориям.
4. Модель: 
   - Input text (masked) + numeric (24)
   - Dense 256 → BN → ReLU → Dropout 0.4
   - Dense 128 → BN → ReLU → Dropout 0.3
   - Output 11 softmax
   - Loss: categorical_crossentropy + label_smoothing 0.05
   - Optimizer: AdamW, lr 1e-3, cosine decay
   - Early stopping patience 12, restore best
5. Калибровка per-class thresholds на validation.
6. Экспорт: `tensorflowjs_converter --input_format keras`

Fine-tuning на устройстве (экспериментально):

- Feedback таблица собирает исправления пользователя.
- Background Sync API: тэг `finly-fine-tune`
- Service Worker: при появлении сети — отправка batch в `/api/finetune` (пока заглушка)
- Локально: 3 эпохи, lr 1e-4, freeze embeddings → обновление только верхних Dense.

Файлы модели в `/public/ml/`:

```
/ml/v4.3/
  model_predict/model.json
  model_predict/*.bin
  model_train_mc/model.json
  model_train_mc/*.bin
  vocab_char.json
  vocab_word.json
  mask_char.json
  mask_word.json
  numeric_stats.json
  merchant_rules.json
  runtime_config.json
  classes.json
```

Загрузка: `prefetchModelAssets()` — кэширует всё при первом запуске через Service Worker.

---

## 16. Телеметрия и drift detection

Телеметрия (opt-in, локально):

```typescript
export interface TelemetryEvent {
  timestamp:           number;
  description:         string;
  predicted_category:  Category;
  source:              ClassifySource;
  confidence:          number;
  uncertainty:        number;
  model_version:       string;
  user_corrected_to?:  Category;
}
```

Drift detection:

```typescript
export interface DriftReport {
  total:              number;
  correction_rate:    number;  // corrections / total
  avg_confidence:     number;
  avg_uncertainty:    number;
  per_class_accuracy: Record<Category, number>;
  needs_retrain:      boolean;
}

export async function computeDriftReport(days = 30): Promise<DriftReport>
```

Критерии `needs_retrain = true`:

- correction_rate > 0.18
- avg_confidence < 0.72 при avg_uncertainty > 0.22
- какая-либо per_class_accuracy < 0.75 при n > 30

Отчёт доступен в Pro → Здоровье → Детектор проблем (скрытый debug).

---

## 17. Производительность

Бенчмарки: Pixel 7 / Chrome 126, Snapdragon 8 Gen 2

| Стадия | p50 | p95 | p99 |
|--------|-----|-----|-----|
| LRU cache | 0.04ms | 0.08ms | 0.15ms |
| User override | 0.8ms | 1.6ms | 3.2ms |
| Rule engine | 0.09ms | 0.22ms | 0.5ms |
| ML fast | 9ms | 14ms | 22ms |
| ML MC (30 passes) | 34ms | 58ms | 94ms |
| Full pipeline avg | 11ms | 19ms | 62ms |

Память:

- TF.js WASM backend fallback: ~28 MB heap
- WebGL backend: ~42 MB GPU
- Модель в памяти: ~7.2 MB (веса)
- IndexedDB: ~2-15 MB typical user (1-3 года транзакций)

Bundle impact:

- tfjs core: 312 KB gz
- classifier runtime: 38 KB gz
- ai chat hooks: 9 KB gz
- total AI chunk: ~385 KB gz

Кэширование: Workbox CacheFirst для `/ml/**`, TTL 30 дней, versioned URLs (`/ml/v4.3/...`).

---

## 18. AI-инсайты и Pro-модуль

`useAIInsights.ts` — генерация карточек инсайтов локально.

Типы инсайтов:

- `alert` — критично: перерасход бюджета, нет сбережений
- `warning` — внимание: 80% бюджета, аномальная трата
- `tip` — совет: оптимизация категории, эффект привычек
- `positive` — похвала: цель достигнута, сбережения растут

Пример генерации:

```typescript
if (savingsRate < 5) insights.push({
  type: 'alert',
  title: 'Критически низкая норма сбережений',
  message: `Всего ${Math.round(savingsRate)}%. Рекомендуется минимум 20%.`,
  action: 'Как улучшить?'
});
```

Pro AI-чат (`AIInsightsPanel.tsx`):

- Полный bubble UI
- История сообщений в sessionStorage
- 5 suggestion pills ротируются
- Markdown-рендер (marked)
- Кнопка “Еженедельный AI-отчёт” → `/api/ai-chat` с system prompt “Сделай еженедельный финансовый отчёт...”
- Индикатор online/offline

---

## 19. Natural Language Parsing транзакций

`AIQuickInput.tsx` + `nlpParser.ts`

Пользователь пишет: “кофе 450 рублей в Старбаксе вчера утром”

Извлечение:

- amount: `/(\d+[.,]?\d*)\s*(р|руб|₽)/` → 450
- merchant/category: ML classify → Еда
- date: “вчера” → Date.now()-1d, “утром” → 09:00
- type: Expense (default, если нет “доход/зарплата”)

Поддерживаемые паттерны времени:

- сегодня, вчера, позавчера
- “3 дня назад”, “на прошлой неделе”
- “утром / днём / вечером / ночью” → 9 / 14 / 19 / 23 ч
- ДД.ММ, ДД.ММ.ГГГГ

Точность парсинга суммы: 97.4% (тест 1.2k фраз).  
Точность даты: 91%.

После парсинга — превью карточка, пользователь подтверждает → сохранение.

Голосовой ввод: SpeechRecognition API (webkitSpeechRecognition), ru-RU, continuous=false, interimResults=true.

---

## 20. Receipt Scanner: OCR + QR

`useReceiptScanner.ts`

Два канала:

**A. QR — фискальные чеки ФНС России**

- BarcodeDetector API (native, Chrome Android)
- fallback: jsQR
- Парсинг: `t=...&s=...&fn=...&i=...&fp=...&n=...`
- Извлечение: сумма, дата, ФН, ФД, ФП

**B. OCR — фото чека**

- Tesseract.js 7.0
- languages: rus+eng
- Предобработка: `imagePreprocess.ts`
  - grayscale
  - adaptive threshold
  - deskew
  - upscale 2x
- Пост-обработка: regex для суммы, даты, магазина

UI: `ReceiptScannerModal.tsx`

- камера / загрузка файла
- превью с confidence bar
- ручное редактирование перед подтверждением
- warning при confidence < 0.65

Точность QR: ~99% при читаемом коде.  
OCR сумма: ~82% correct, ~12% ±5₽, ~6% fail.

---

## 21. What-If симулятор и прогнозы

Pro → Прогнозы

**ML-прогноз расходов на 30 дней**

- Линейная регрессия по 90-дневной истории (daily aggregate)
- Доверительный интервал: ±1.96·SE
- R² отображается в UI
- Recharts AreaChart с CI-полосами

**Прогноз баланса 3 месяца**

- cash flow projection: income_pattern - expense_forecast
- AreaChart

**What-If симулятор** (`WhatIfSimulator.tsx`)

- Слайдеры Radix UI для топ-4 категорий
- Пресеты:
  - “Правило 50/30/20”
  - “Режим экономии −20%”
  - “Сброс”
- Моментальный расчёт:
  ```
  new_monthly_saving = income - Σ adjusted_expenses
  yearly_saving = new_monthly_saving * 12
  new_savings_rate = new_monthly_saving / income * 100
  ```

**Эффект малых привычек** (`CoffeeEffect.tsx`)

- Поиск регулярных трат: count ≥ period_days/3
- Проекция: день / месяц / год
- Эквивалент: “это 2.3 месяца аренды”

---

## 22. Financial Health Score

Pro → Здоровье

Полукруговой gauge 0–100, 6 метрик:

1. **Норма сбережений** (вес 25%)
   - 0% → 0 баллов, 20%+ → 100 баллов
2. **Обязательные расходы** (20%)
   - доля обязательных (флаг в категории) в расходах
   - <50% → 100 баллов
3. **Регулярность доходов** (15%)
   - коэффициент вариации поступлений
4. **Резервный фонд** (15%)
   - баланс / среднемесячные расходы
   - 6+ мес → 100 баллов
5. **Диверсификация (HHI)** (15%)
   - Herfindahl-Hirschman Index по расходам
   - низкий HHI → хорошо
6. **Долговая нагрузка** (10%)
   - пока заглушка, резерв

Формула:

```
HealthScore = Σ metric_score_i * weight_i
```

Drilldown: тап на метрику → AnimatePresence карточка:

- объяснение формулы
- текущее значение
- 2–3 совета “как улучшить”

План улучшения: авто-генерация рекомендаций по метрикам <60 баллов.

Детектор проблем: алерты danger/warning вверху вкладки.

---

## 23. Файловая структура модели

```
/public/ml/v4.3/
├── model_predict/
│   ├── model.json          # TF.js Layers topology
│   └── group1-shard...bin  # веса
├── model_train_mc/
│   ├── model.json
│   └── group1-shard...bin
├── vocab_char.json         # { " a ": 0, " ab": 1, ... }
├── vocab_word.json
├── mask_char.json          # boolean[]
├── mask_word.json
├── numeric_stats.json      # mean / std 24 features
├── merchant_rules.json     # ~1.2k правил
├── runtime_config.json     # thresholds, MC params
├── classes.json            # ["Еда", "Продукты", ...]
└── feature_importance.json # топ фичи, для explanation
```

Загрузка в `FinlyClassifier.init()`:

```typescript
async init(modelBaseUrl = '/ml/v4.3/'): Promise<void> {
  const base = modelBaseUrl.endsWith('/') ? modelBaseUrl : modelBaseUrl + '/';
  const [
    charJ, wordJ, maskJ_char, maskJ_word,
    statsJ, merchantJ, classesJ, rtConfigJ
  ] = await Promise.all([
    fetch(base + 'vocab_char.json').then(r=>r.json()),
    fetch(base + 'vocab_word.json').then(r=>r.json()),
    // ...
  ]);
  // load TF.js models
  this.modelPredict = await tf.loadLayersModel(base + 'model_predict/model.json');
  this.modelMC      = await tf.loadLayersModel(base + 'model_train_mc/model.json');
  // ...
}
```

---

## 24. Runtime Config

`runtime_config.json` — полный пример:

```json
{
  "mode": "production",
  "model_version": "4.3.0",
  "schema_version": "2",
  "mc_dropout_passes": 30,
  "uncertainty_mode": "epistemic",
  "uncertainty_threshold": 0.18,
  "uncertainty_quantile_on_val": 0.85,
  "margin_threshold": 0.12,
  "unc_margin_relax": 1.5,
  "min_conditions_to_accept": 2,
  "per_class_thresholds": {
    "Продукты": 0.48,
    "Транспорт": 0.50,
    "Еда": 0.52,
    "Аренда": 0.42,
    "Зарплата": 0.40,
    "Коммунальные": 0.55,
    "Здоровье": 0.60,
    "Развлечения": 0.58,
    "Шопинг": 0.57,
    "Инвестиции": 0.62,
    "Uncategorized": 0.70
  },
  "min_class_threshold": 0.40,
  "max_class_threshold": 0.70,
  "default_class_threshold": 0.55,
  "fallback_label": "Uncategorized",
  "preferred_inference": "mc_dropout",
  "merchant_feature_start": 5,
  "merchant_score_start": 5,
  "merchant_score_end": 16,
  "merchant_feature_names": [
    "m_len","m_tokens","m_generic","m_weight","m_conflicts",
    "m_score_max","m_score_sum","m_score_entropy"
  ],
  "side_feature_names": [
    "amount_log","hour_sin","hour_cos","dow_sin","dow_cos"
  ]
}
```

Конфиг hot-reloadable: можно обновить `runtime_config.json` без пересборки модели — thresholds подтянутся при следующем `init()`.

---

## 25. API reference

### FinlyClassifier

```typescript
class FinlyClassifier {
  constructor(db?: ClassifierDB, config?: ClassifierConfig)
  async init(modelBaseUrl?: string): Promise<void>
  async classify(description: string, amount?: number, timestamp?: number): Promise<ClassifyResult>
  async classifyBatch(items: Array<{description:string, amount?:number, timestamp?:number}>): Promise<ClassifyResult[]>
  async learn(description: string, correctCategory: Category, correctType: TxType): Promise<void>
  clearCache(): void
  get manifest(): Manifest | null
}
```

### Chat / AI

```typescript
// offline
export async function answerQuery(text: string, ctx: ChatCtx): Promise<ChatAnswer>

// online
export async function chatCompletion(systemPrompt: string, messages: AIMessage[]): Promise<string>

// context
export async function buildFinancialSnapshot(): Promise<string>

// hooks
function useAIChat(): {
  messages: ChatMessage[];
  sendMessage: (text: string) => Promise<void>;
  isLoading: boolean;
  isOffline: boolean;
  clearHistory: () => void;
}

function useAIInsights(): {
  insights: AIInsight[];
  loading: boolean;
  refresh: () => void;
}
```

### Analytics (используется AI-слоем)

- `getBalanceByPeriod(start, end)`
- `getExpensesByCategory(start, end)`
- `getSavingsRate(start, end)`
- `getMonthForecast()`
- `getAnomalousTransactions(start, end)`
- `getSpendByDayOfWeek(start, end)`
- `getIncomePattern()`
- `getLargestTransactions(limit, start, end)`
- `getAverageDailySpend(start, end)`
- `getGoalsProgress()`
- `getAllBudgetsProgress(start, end)`
- `getRecurringUpcoming(days)`

Все функции — IndexedDB, <10ms typical.

---

## 26. Тестирование

Vitest 4.1 + Testing Library

Покрытие AI-модуля:

```
src/lib/classifier/finly_runtime.test.ts   94.2% statements
src/app/hooks/chatContext.test.ts          91.7%
src/services/ai/aiClient.test.ts           88.5%
src/services/ai/contextBuilder.test.ts     96.1%
```

Ключевые тесты:

- `finly_runtime.test.ts` — 93% accuracy assertion, MC Dropout std sanity, per-class thresholds, cache eviction, user_override precedence, batch classify, drift report
- `chatContext.test.ts` — все 17 интентов, period extraction (ru), shift follow-up, fallback
- `aiClient.test.ts` — network error → AIClientError('network'), 500→auth, 503→rate_limit, empty response
- `contextBuilder.test.ts` — snapshot формат, пустые данные, локализация ru-RU

Запуск:

```bash
npm test
npm run test:coverage
```

CI: GitHub Actions `.github/workflows/ci.yml` — build + test + deploy Vercel
Quality Gates: `.github/workflows/quality.yml` — security audit, bundle size < 1.2 MB gz, test coverage ≥ 80%, PWA validation
Lighthouse: `.github/workflows/lighthouse.yml` — performance audits

---

## 27. Деплой и версионирование

Деплой: Vercel

- Статический SPA (Vite build → `dist/`)
- Serverless Function: `api/ai-chat.ts`
- ENV: `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`

Версионирование модели:

- URL versioned: `/ml/v4.3/...`
- Service Worker кэширует по версии
- При bump → новый URL → старый кэш инвалидируется автоматически
- `model_version` в `ClassifyResult` — для телеметрии

CHANGELOG: см. `CHANGELOG.md` — ведётся с v0.1.0, semantic versioning.

Текущая app версия: см. `package.json` → `"version": "1.4.0"`

Совместимость:

| App | Classifier | Schema |
|-----|------------|--------|
| 1.0.x | v4.0 | db v1 |
| 1.2.x | v4.1 | db v2 |
| 1.3.x | v4.2 | db v3 |
| **1.4.x** | **v4.3** | **db v3** |

Миграции Dexie: `src/db/finly_db.ts` — 3 версии схемы, авто-upgrade.

---

## 28. Roadmap

**v4.4 (Q3 2026):**

- ONNX Runtime Web — сравнение с TF.js, цель latency <5ms
- Квантизация int8 → модель <900 KB
- Multi-label: “Еда + Развлечения” (например, ресторан)
- Embeddings: MiniLM-ru fine-tuned на транзакциях
- Федеративное обучение через Background Sync

**v4.5:**

- LLM on-device: WebLLM / Phi-3-mini (3.8B, 4-bit)
- Полностью офлайн AI-чат без intent-правил
- RAG по истории транзакций (vector store в IndexedDB, HNSW)

**Pro AI v2:**

- Автокатегоризация подписок (recurring detection ML)
- Anomaly detection: Isolation Forest в браузере
- Cash flow forecasting: Temporal Fusion Transformer (TFT)
- Персональные инсайты на LLM с long-term memory

**Инфраструктура:**

- Model registry: Hugging Face Hub mirror
- A/B тестирование моделей (feature flags)
- OpenTelemetry трассировка classify()
- WebGPU backend для TF.js

---

## 29. FAQ

**Q: Почему не cloud ML API?**  
A: Privacy-first. Финансовые описания (“Старбакс 450р”, “аренда однушка”) — чувствительные данные. Локальный TF.js = zero data exfiltration.

**Q: Точность 93% — как измеряли?**  
A: Hold-out test 6 800 транзакций, стратифицировано, macro-F1 0.91, weighted-F1 0.93. Confusion matrix в `docs/AUDIT.md`.

**Q: Можно ли дообучить на своих данных?**  
A: Да. `classifier.learn(description, category, type)` → пишет в `feedback` таблицу. Batch fine-tuning через Background Sync — экспериментально.

**Q: Почему OpenRouter, а не напрямую OpenAI?**  
A: OpenRouter даёт failover между провайдерами, единое API, RU-доступность, цена $0.15 / 1M tokens (gpt-4o-mini).

**Q: Офлайн-чат понимает только русский?**  
A: Intent-паттерны RU + частично EN. NLP-парсер — RU приоритет. Планируется i18n.

**Q: Сколько весит AI-часть?**  
A: ~4.4 MB модели (кэш SW) + 385 KB gz JS. Первый холодный старт ~2.1s на 4G, повторный ~180ms (cache).

**Q: Как добавить новую категорию?**  
A: 1) Добавить в `Category` type, 2) переобучить модель с новым output dim, 3) обновить `classes.json`, 4) bump model_version. User-категории (custom) — мапятся на ближайшую системную для ML, UI показывает custom.

**Q: MC Dropout тормозит?**  
A: Только для неуверенных случаев (~15% трафика). Fast path 9-14ms. Средний пользователь не замечает.

---

## 30. Приложение: примеры кода

### Базовая классификация

```typescript
import { FinlyClassifier } from '@/lib/classifier/finly_runtime';

const clf = new FinlyClassifier(db);
await clf.init('/ml/v4.3/');

const result = await clf.classify('кофе старбакс 450', 450, Date.now());
console.log(result);
// {
//   category: 'Еда',
//   type: 'Expense',
//   confidence: 0.87,
//   uncertainty: 0.06,
//   source: 'ml',
//   top3: [
//     { category: 'Еда', prob: 0.87, std: 0.06 },
//     { category: 'Продукты', prob: 0.08, std: 0.04 },
//     { category: 'Развлечения', prob: 0.03, std: 0.02 }
//   ],
//   explanation: ['m_score_Еда','amount_log','hour_sin','char_ коф','word_старбакс'],
//   model_version: '4.3.0',
//   latency_ms: 14
// }
```

### Batch классификация

```typescript
const batch = await clf.classifyBatch([
  { description: 'пятёрочка 1200', amount: 1200 },
  { description: 'яндекс такси 340', amount: 340 },
  { description: 'зарплата', amount: 185000 },
]);

// → Продукты, Транспорт, Зарплата
```

### Обучение на исправлении

```typescript
await clf.learn('кофе старбакс', 'Развлечения', 'Expense');
// user_override запишется в IndexedDB
// feedback entry → для будущего fine-tune
```

### AI-чат (React hook)

```typescript
function ChatWidget() {
  const { messages, sendMessage, isLoading, isOffline } = useAIChat();

  return (
    <div>
      {isOffline && <Badge>офлайн-режим</Badge>}
      {messages.map(m => <Bubble key={m.id} {...m} />)}
      <input
        onKeyDown={e => e.key==='Enter' && sendMessage(e.currentTarget.value)}
        placeholder="Спросите про финансы..."
      />
    </div>
  );
}
```

### Прямой вызов offline intent

```typescript
import { answerQuery } from '@/app/hooks/chatContext';

const res = await answerQuery('аномальные траты за месяц', {});
console.log(res.answer);
// "Аномальные траты за этот месяц:
// • Развлечения (Концерт) — 12 000 ₽ (в 4× больше обычного ~3 000 ₽)"
console.log(res.suggestions);
// ["На чём сэкономить?", "В какой день больше трачу?", "Сравнить с прошлым"]
```

### Онлайн chat completion

```typescript
import { chatCompletion } from '@/services/ai/aiClient';
import { buildFinancialSnapshot } from '@/services/ai/contextBuilder';

const snapshot = await buildFinancialSnapshot();
const systemPrompt = `Ты финансовый ассистент Finly. Отвечай кратко на русском.\n\n${snapshot}`;

const answer = await chatCompletion(systemPrompt, [
  { role: 'user', content: 'Как мне увеличить сбережения?' }
]);
```

### Drift report

```typescript
import { computeDriftReport } from '@/lib/classifier/finly_runtime';

const drift = await computeDriftReport(30);
if (drift.needs_retrain) {
  console.warn('Model drift detected', drift.correction_rate);
  // trigger background fine-tune
}
```

---

## Заключение

Finly AI — это production-ready гибридная система:

- **Локально:** TensorFlow.js, 93% accuracy, MC Dropout uncertainty, 11-19ms p95
- **Онлайн:** OpenRouter proxy, secure, 800ms typical, offline fallback <50ms
- **Privacy:** zero-knowledge, IndexedDB only, API ключ server-side
- **Explainable:** top-5 features, per-class thresholds, confidence+uncertainty
- **Extensible:** feedback loop, drift detection, Background Sync fine-tune

Весь стек — open source, TypeScript, tested (coverage >88%), PWA offline-first.

Документация покрывает: архитектуру v4.3, 5-уровневый пайплайн, 24 признака, TF-IDF, merchant rules, dual model, MC Dropout, intent-роутер 17×, OpenRouter proxy, context builder, security, обучение, телеметрию, производительность, Pro-модуль, NLP-парсинг, OCR/QR, What-If, Health Score.

Актуально для: Finly 1.4.0 / Classifier 4.3.0 / 28 июня 2026

---

**Ссылки:**

- Репозиторий: https://github.com/Shadovv-Government/Finly
- CHANGELOG: ./CHANGELOG.md
- Архитектура: ./ARCHITECTURE.md
- Схема БД: ./DATABASE_SCHEMA.md
- Аудит: ./AUDIT.md
- Stack: ./APP_STACK_AND_FEATURES.md

**Лицензия:** MIT (см. корень репозитория)

**Контакты / Issues:** GitHub Issues

---

*Документ сгенерирован сообществом. PR welcome.*
*Строк в документе: ~890*
*Слов: ~6 400*
*Последнее обновление: 2026-06-28*
