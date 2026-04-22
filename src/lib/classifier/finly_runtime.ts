/**
 * Finly Classifier Runtime v4
 *
 * Classification pipeline (priority order):
 *   1. LRU cache          — exact string, ~0ms
 *   2. User overrides     — IndexedDB exact match, ~1ms
 *   3. Rule engine        — MCC + fuzzy merchant match, ~0.1ms
 *   4. ML (MC Dropout)    — N forward passes, mean±std, ~20-40ms
 *   5. Low-confidence     — Uncategorized + top-3
 *
 * Key improvements over v3:
 *   - MC Dropout epistemic uncertainty (N=20 passes, controlled by manifest)
 *   - Numeric features: log(amount), cyclic day-of-week, cyclic hour-of-day
 *   - Feature selection mask (SelectKBest) applied after TF-IDF concat
 *   - LRU cache (configurable size) for repeated descriptions
 *   - Fuzzy merchant matching: Levenshtein + phonetic transliteration
 *   - Incremental fine-tune: model.fit() on user corrections in Service Worker
 *   - Explanation: top-N features that drove the prediction
 *   - Schema v2 validation
 */

import * as tf from '@tensorflow/tfjs';
import type Dexie from 'dexie';

// ─── Public types ────────────────────────────────────────────────────────────

export type Category =
  | 'Еда' | 'Продукты' | 'Транспорт' | 'Шопинг' | 'Коммунальные'
  | 'Здоровье' | 'Развлечения' | 'Аренда' | 'Зарплата' | 'Инвестиции'
  | 'Uncategorized';

export type TxType = 'Income' | 'Expense';
export type ClassifySource = 'cache' | 'user_override' | 'rule' | 'ml' | 'low_confidence';

export interface ClassifyResult {
  category:       Category;
  type:           TxType;
  confidence:     number;               // mean MC probability for predicted class
  uncertainty:    number;               // MC std for predicted class (epistemic)
  source:         ClassifySource;
  top3:           Array<{ category: Category; prob: number; std: number }>;
  explanation?:   string[];             // top-5 feature names that drove prediction
  rule_id?:       string;
  model_version?: string;
  latency_ms:     number;
}

// ─── Manifest (schema v2) ───────────────────────────────────────────────────

interface Manifest {
  model_version:  string;
  schema_version: string;
  created_at:     string;
  classes:        Category[];
  num_classes:    number;
  input: {
    text_dim:         number;
    numeric_dim:      number;
    char_raw_dim:     number;
    word_raw_dim:     number;
    concat_order:     ('char' | 'word')[];
    numeric_features: string[];
  };
  inference: {
    mc_dropout_passes:    number;
    uncertainty_threshold: number;
    per_class_thresholds: Record<string, number>;
    global_threshold:     number;
  };
  metrics:  Record<string, number>;
  training: Record<string, unknown>;
}

// ─── Storage types ───────────────────────────────────────────────────────────

export interface UserOverride {
  description_normalized: string;
  category:    Category;
  type:        TxType;
  updated_at:  number;
  match_count: number;
}

export interface FeedbackEntry {
  id?:                  number;
  description:          string;
  description_normalized: string;
  text_vec:             number[];   // SelectKBest-selected feature vector (for fine-tune)
  numeric_vec:          number[];
  correct_label:        number;
  correct_type:         number;
  timestamp:            number;
  used_in_training:     boolean;
}

export interface TelemetryEvent {
  id?:                 number;
  timestamp:           number;
  description:         string;
  predicted_category:  Category;
  source:              ClassifySource;
  confidence:          number;
  uncertainty:         number;
  model_version:       string;
  user_corrected_to?:  Category;
}

export interface ClassifierDB {
  user_overrides: Dexie.Table<UserOverride, string>;
  feedback:       Dexie.Table<FeedbackEntry, number>;
  telemetry:      Dexie.Table<TelemetryEvent, number>;
}

// ─── TF-IDF params ──────────────────────────────────────────────────────────

interface TfidfParams {
  analyzer:    'char_wb' | 'word';
  ngram_range: [number, number];
  sublinear_tf: boolean;
  n_features:  number;
  vocab:       Record<string, number>;
  idf:         number[];
}

interface FeatureMask {
  mask:         boolean[];
  n_selected:   number;
  concat_order: ('char' | 'word')[];
}

interface FeatureImportance {
  feature: string;
  gain:    number;
}

// ─── LRU Cache ───────────────────────────────────────────────────────────────

class LRUCache<K, V> {
  private map = new Map<K, V>();
  constructor(private maxSize: number) {}

  get(key: K): V | undefined {
    const val = this.map.get(key);
    if (val === undefined) return undefined;
    // Move to end (most recently used)
    this.map.delete(key);
    this.map.set(key, val);
    return val;
  }

  set(key: K, val: V): void {
    if (this.map.has(key)) this.map.delete(key);
    else if (this.map.size >= this.maxSize) {
      // Evict least recently used (first entry)
      this.map.delete(this.map.keys().next().value!);
    }
    this.map.set(key, val);
  }

  clear(): void { this.map.clear(); }
  get size(): number { return this.map.size; }
}

// ─── TF-IDF (byte-exact sklearn port) ───────────────────────────────────────

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

const WORD_RE = /[\p{L}\p{N}_]+/gu;

function tokenizeWord(text: string, nMin: number, nMax: number): string[] {
  const words = text.match(WORD_RE) ?? [];
  const grams: string[] = [];
  for (let n = nMin; n <= nMax; n++) {
    for (let i = 0, max = words.length - n; i <= max; i++) {
      grams.push(words.slice(i, i + n).join(' '));
    }
  }
  return grams;
}

function tfidfVec(text: string, p: TfidfParams): Float32Array {
  const lower = text.toLowerCase();
  const [nMin, nMax] = p.ngram_range;
  const grams = p.analyzer === 'char_wb'
    ? tokenizeCharWb(lower, nMin, nMax)
    : tokenizeWord(lower, nMin, nMax);

  const counts = new Map<number, number>();
  for (const g of grams) {
    const idx = p.vocab[g];
    if (idx !== undefined) counts.set(idx, (counts.get(idx) ?? 0) + 1);
  }

  const vec = new Float32Array(p.n_features);
  for (const [idx, cnt] of counts) {
    // sklearn sublinear_tf: 1 + log(cnt)  — NOT log(1 + cnt/total)
    vec[idx] = (p.sublinear_tf ? 1 + Math.log(cnt) : cnt) * p.idf[idx];
  }

  let sq = 0;
  for (let i = 0; i < vec.length; i++) sq += vec[i] * vec[i];
  if (sq > 0) { const inv = 1 / Math.sqrt(sq); for (let i = 0; i < vec.length; i++) vec[i] *= inv; }
  return vec;
}

// Apply boolean feature mask (SelectKBest output)
function applyMask(vec: Float32Array, mask: boolean[]): Float32Array {
  const out: number[] = [];
  for (let i = 0; i < mask.length; i++) {
    if (mask[i]) out.push(vec[i]);
  }
  return new Float32Array(out);
}

// ─── Numeric features (must match training: §5 make_numeric) ───────────────

function numericFeatures(amount: number | undefined, date: Date | undefined): Float32Array {
  const vec = new Float32Array(5);
  // log(1 + |amount|), with 0 as fallback (unlabeled/unknown)
  vec[0] = amount !== undefined ? Math.log1p(Math.abs(amount)) : 0;
  const dow = date ? date.getDay() : 0;   // 0=Sun in JS, matches Python weekday offset via sin/cos
  const hour = date ? date.getHours() : 0;
  vec[1] = Math.sin(2 * Math.PI * dow / 7);
  vec[2] = Math.cos(2 * Math.PI * dow / 7);
  vec[3] = Math.sin(2 * Math.PI * hour / 24);
  vec[4] = Math.cos(2 * Math.PI * hour / 24);
  return vec;
}

// ─── Fuzzy matching helpers ──────────────────────────────────────────────────

// Levenshtein distance (capped at maxDist for performance)
function levenshtein(a: string, b: string, maxDist = 3): number {
  if (Math.abs(a.length - b.length) > maxDist) return maxDist + 1;
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => i);
  for (let j = 1; j <= n; j++) {
    let prev = dp[0]; dp[0] = j;
    for (let i = 1; i <= m; i++) {
      const tmp = dp[i];
      dp[i] = a[i-1] === b[j-1] ? prev : 1 + Math.min(prev, dp[i], dp[i-1]);
      prev = tmp;
    }
  }
  return dp[m];
}

// Transliteration table (Russian → Latin) for phonetic matching
const TRANSLIT: Record<string, string> = {
  а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',
  и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',
  с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'c',ч:'ch',ш:'sh',щ:'sch',
  ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya',
};

function transliterate(text: string): string {
  return text.toLowerCase().split('').map(ch => TRANSLIT[ch] ?? ch).join('');
}

// ─── Rules ───────────────────────────────────────────────────────────────────

export interface Rule {
  id:                  string;
  category:            Category;
  type:                TxType;
  priority:            number;
  mcc?:                string[];
  exact_keywords?:     string[];    // lowercase substring exact match
  fuzzy_keywords?:     string[];    // Levenshtein distance ≤ 2 per token
  translit_keywords?:  string[];    // match after transliteration
  regex?:              RegExp;
}

const BUILTIN_RULES: Rule[] = [
  // MCC — highest priority (deterministic, bank-provided)
  { id:'mcc_food',      category:'Еда',          type:'Expense', priority:100, mcc:['5812','5813','5814','5811'] },
  { id:'mcc_grocery',   category:'Продукты',     type:'Expense', priority:100, mcc:['5411','5422','5441','5499'] },
  { id:'mcc_transport', category:'Транспорт',    type:'Expense', priority:100, mcc:['4111','4121','4131','5541','5542','4511'] },
  { id:'mcc_shopping',  category:'Шопинг',       type:'Expense', priority:100, mcc:['5699','5945','5732','5311','5651','5691','5712'] },
  { id:'mcc_util',      category:'Коммунальные', type:'Expense', priority:100, mcc:['4900','4813','4814','4899','7372'] },
  { id:'mcc_health',    category:'Здоровье',     type:'Expense', priority:100, mcc:['5912','8011','7011','8021','8062'] },
  { id:'mcc_ent',       category:'Развлечения',  type:'Expense', priority:100, mcc:['7832','7922','7993','7996'] },
  { id:'mcc_rent',      category:'Аренда',       type:'Expense', priority:100, mcc:['6513'] },
  { id:'mcc_invest',    category:'Инвестиции',   type:'Expense', priority:100, mcc:['6211','6012','6051'] },

  // Income signals — near-certain
  { id:'kw_salary',    category:'Зарплата',   type:'Income', priority:98,
    exact_keywords: ['зарплата','выплата зарплаты','аванс','оклад','перевод от работодателя','salary','payroll'] },
  { id:'kw_dividend',  category:'Инвестиции', type:'Income', priority:98,
    exact_keywords: ['дивиденды','дивиденд','купонный доход','проценты по вкладу','проценты депозит'] },

  // Rent — unambiguous phrases
  { id:'kw_rent',      category:'Аренда', type:'Expense', priority:95,
    exact_keywords: ['аренда квартиры','арендная плата','оплата аренды','rent payment','monthly rent','съём жилья','оплата за проживание'] },

  // High-frequency Russian merchants — exact
  { id:'kw_pyaterochka', category:'Продукты', type:'Expense', priority:90,
    exact_keywords: ['пятёрочка','пятерочка','5ka'],
    translit_keywords: ['pyaterochka'] },
  { id:'kw_magnit',      category:'Продукты', type:'Expense', priority:90,
    exact_keywords: ['магнит '], fuzzy_keywords: ['магнит'] },
  { id:'kw_perekrestok', category:'Продукты', type:'Expense', priority:90,
    exact_keywords: ['перекрёсток','перекресток'],
    translit_keywords: ['perekrestok'] },
  { id:'kw_vkusvill',    category:'Продукты', type:'Expense', priority:90,
    exact_keywords: ['вкусвилл'], translit_keywords: ['vkusvill'] },
  { id:'kw_samokat',     category:'Продукты', type:'Expense', priority:90,
    exact_keywords: ['самокат'], translit_keywords: ['samokat'] },
  { id:'kw_yndx_lavka',  category:'Продукты', type:'Expense', priority:90,
    exact_keywords: ['яндекс лавка','yandex.lavka','lavka'] },
  { id:'kw_wildberries', category:'Шопинг',   type:'Expense', priority:90,
    exact_keywords: ['wildberries','вайлдберриз','wb ru','wb.ru'] },
  { id:'kw_ozon',        category:'Шопинг',   type:'Expense', priority:90,
    exact_keywords: ['ozon','озон'] },
  { id:'kw_yndx_taxi',   category:'Транспорт',type:'Expense', priority:90,
    exact_keywords: ['яндекс такси','yandex.taxi','yandex taxi','yndx.taxi'] },
  { id:'kw_uber',        category:'Транспорт',type:'Expense', priority:90,
    exact_keywords: ['uber ','uber*','uber.'] },
  { id:'kw_yndx_food',   category:'Еда',      type:'Expense', priority:90,
    exact_keywords: ['яндекс еда','yandex.eda','yandex eats'] },
  { id:'kw_netflix',     category:'Коммунальные', type:'Expense', priority:90,
    exact_keywords: ['netflix','нетфликс'] },
  { id:'kw_spotify',     category:'Коммунальные', type:'Expense', priority:90,
    exact_keywords: ['spotify'] },
  { id:'kw_yndx_plus',   category:'Коммунальные', type:'Expense', priority:90,
    exact_keywords: ['яндекс плюс','yandex.plus','yandex plus'] },
];

// MCC regex: "MCC 5812" or "MCC5812"
const MCC_RE = /\bmcc\s*(\d{4})\b/gi;

function matchRule(desc: string, rules: Rule[]): { rule: Rule } | null {
  const lower = desc.toLowerCase();
  const translit = transliterate(lower);

  for (const r of rules) {
    // MCC match
    if (r.mcc) {
      let m: RegExpExecArray | null;
      MCC_RE.lastIndex = 0;
      while ((m = MCC_RE.exec(desc)) !== null) {
        if (r.mcc.includes(m[1])) return { rule: r };
      }
    }
    // Exact substring
    if (r.exact_keywords?.some(kw => lower.includes(kw))) return { rule: r };
    // Transliteration match
    if (r.translit_keywords?.some(kw => translit.includes(kw))) return { rule: r };
    // Fuzzy: tokenise and check each token against keywords
    if (r.fuzzy_keywords) {
      const tokens = lower.match(WORD_RE) ?? [];
      for (const kw of r.fuzzy_keywords) {
        for (const tok of tokens) {
          if (tok.length >= 4 && levenshtein(tok, kw, 2) <= 2) return { rule: r };
        }
      }
    }
    // Regex
    if (r.regex) { r.regex.lastIndex = 0; if (r.regex.test(desc)) return { rule: r }; }
  }
  return null;
}

// ─── MC Dropout inference ───────────────────────────────────────────────────

async function mcDropoutPredict(
  model: tf.LayersModel,
  textVec: Float32Array,
  numVec: Float32Array,
  nPasses: number,
): Promise<{ meanProbs: Float32Array; stdProbs: Float32Array; typeProb: number }> {
  const D = textVec.length, N = numVec.length;
  const allCatProbs: Float32Array[] = [];
  let typeSum = 0;

  for (let pass = 0; pass < nPasses; pass++) {
    const result = tf.tidy(() => {
      const tIn = tf.tensor2d(textVec, [1, D]);
      const nIn = tf.tensor2d(numVec,  [1, N]);
      // training=true keeps Dropout active → epistemic uncertainty
      // TF.js returns Tensor[] for multi-output models, not a named object
      const raw = model.predict([tIn, nIn], { training: true } as tf.ModelPredictConfig);
      const out = (Array.isArray(raw) ? raw : [raw]) as tf.Tensor[];
      const catLogits = out[0].squeeze([0]);   // category_output
      const catProbs  = tf.softmax(catLogits);
      const tp = out[1].squeeze([0]);          // type_output
      return { probs: catProbs.dataSync() as Float32Array, tp: tp.dataSync()[0] };
    });
    allCatProbs.push(result.probs);
    typeSum += result.tp;
  }

  const C = allCatProbs[0].length;
  const meanProbs = new Float32Array(C);
  const stdProbs  = new Float32Array(C);

  for (let c = 0; c < C; c++) {
    let s = 0, s2 = 0;
    for (let p = 0; p < nPasses; p++) { const v = allCatProbs[p][c]; s += v; s2 += v * v; }
    meanProbs[c] = s / nPasses;
    stdProbs[c]  = Math.sqrt(Math.max(0, s2 / nPasses - meanProbs[c] ** 2));
  }

  return { meanProbs, stdProbs, typeProb: typeSum / nPasses };
}

// ─── Main classifier ─────────────────────────────────────────────────────────

export interface ClassifierConfig {
  modelBaseUrl:     string;          // e.g. '/model/'
  db?:              ClassifierDB;
  customRules?:     Rule[];
  cacheSize?:       number;          // LRU cache entries, default 500
  enableTelemetry?: boolean;         // default true
  mcPasses?:        number;          // override manifest mc_dropout_passes
}

export class FinlyClassifier {
  private model:       tf.LayersModel | null = null;
  private manifest:    Manifest | null = null;
  private tfidfChar:   TfidfParams | null = null;
  private tfidfWord:   TfidfParams | null = null;
  private maskData:    FeatureMask | null = null;
  private featureImportance: FeatureImportance[] = [];
  private featureIndexByName = new Map<string, number>();
  private rules:       Rule[] = [];
  private lru:         LRUCache<string, ClassifyResult>;
  private cfg:         ClassifierConfig;
  private ready =      false;

  constructor(cfg: ClassifierConfig) {
    this.cfg = { cacheSize: 500, enableTelemetry: true, ...cfg };
    this.lru = new LRUCache(this.cfg.cacheSize!);
  }

  async init(): Promise<void> {
    const base = this.cfg.modelBaseUrl.replace(/\/$/, '') + '/';

    // 1. Manifest — validate schema first
    this.manifest = await (await fetch(base + 'manifest.json')).json() as Manifest;
    if (!['1', '2'].includes(this.manifest.schema_version)) {
      throw new Error(
        `Finly: unsupported schema_version '${this.manifest.schema_version}'. ` +
        `This runtime supports schema versions 1 and 2. Redeploy the PWA.`
      );
    }

    // 2. Vocabularies + mask
    const [charJ, wordJ, maskJ] = await Promise.all([
      (await fetch(base + 'tfidf_char.json')).json() as Promise<TfidfParams>,
      (await fetch(base + 'tfidf_word.json')).json() as Promise<TfidfParams>,
      (await fetch(base + 'feature_mask.json')).json() as Promise<FeatureMask>,
    ]);
    this.tfidfChar = charJ;
    this.tfidfWord = wordJ;
    this.maskData  = maskJ;
    this.buildFeatureIndexMap();

    // 3. Feature importance (optional, for explain)
    try {
      this.featureImportance = await (await fetch(base + 'feature_importance.json')).json();
    } catch { /* non-critical */ }

    // 4. TF.js model
    // Note: model.json has been pre-patched to remove L2 regularizer references
    // (regularizers only affect training loss, not inference output).
    this.model = await tf.loadLayersModel(base + 'model_predict/model.json');

    // 5. Rules: custom (higher priority) + builtins
    this.rules = [...(this.cfg.customRules ?? []), ...BUILTIN_RULES]
      .sort((a, b) => b.priority - a.priority);

    // 6. Warm-up: single dummy pass to compile WebGL kernels
    tf.tidy(() => {
      const tDummy = tf.zeros([1, this.manifest!.input.text_dim]);
      const nDummy = tf.zeros([1, this.manifest!.input.numeric_dim]);
      const raw = this.model!.predict([tDummy, nDummy]);
      (Array.isArray(raw) ? raw : [raw]).forEach((t: tf.Tensor) => t.dataSync());
    });

    this.ready = true;
    console.info(
      `[Finly] v${this.manifest.model_version} loaded. ` +
      `text_dim=${this.manifest.input.text_dim}, ` +
      `mc_passes=${this.manifest.inference.mc_dropout_passes}, ` +
      `cache=${this.cfg.cacheSize}`
    );
  }

  async classify(
    description: string,
    amount?: number,
    date?: Date,
  ): Promise<ClassifyResult> {
    if (!this.ready) throw new Error('FinlyClassifier.init() not called');
    const t0 = performance.now();
    const norm = description.trim().toLowerCase();

    // ── 1. LRU cache ──────────────────────────────────────────────────────
    const cacheKey = `${norm}|${amount ?? ''}|${date?.toISOString().slice(0,13) ?? ''}`;
    const cached = this.lru.get(cacheKey);
    if (cached) return { ...cached, source: 'cache', latency_ms: performance.now() - t0 };

    // ── 2. User overrides ─────────────────────────────────────────────────
    if (this.cfg.db) {
      try {
        const ov = await this.cfg.db.user_overrides
          .where('description_normalized').equals(norm).first();
        if (ov) {
          await this.cfg.db.user_overrides.update(norm, {
            match_count: (ov.match_count ?? 0) + 1, updated_at: Date.now(),
          });
          const r = this.result({ category: ov.category, type: ov.type,
            confidence: 1, uncertainty: 0, source: 'user_override',
            top3: [{ category: ov.category, prob: 1, std: 0 }],
            latency_ms: performance.now() - t0 }, description);
          this.lru.set(cacheKey, r);
          return r;
        }
      } catch (e) { console.warn('[Finly] override lookup failed:', e); }
    }

    // ── 3. Rules ──────────────────────────────────────────────────────────
    const hit = matchRule(description, this.rules);
    if (hit) {
      const r = this.result({ category: hit.rule.category, type: hit.rule.type,
        confidence: 0.99, uncertainty: 0, source: 'rule', rule_id: hit.rule.id,
        top3: [{ category: hit.rule.category, prob: 0.99, std: 0 }],
        latency_ms: performance.now() - t0 }, description);
      this.lru.set(cacheKey, r);
      return r;
    }

    // ── 4. ML (MC Dropout) ────────────────────────────────────────────────
    const { textVec, numVec } = this.buildVectors(norm, amount, date);
    const nPasses = this.cfg.mcPasses ?? this.manifest!.inference.mc_dropout_passes;
    const { meanProbs, stdProbs, typeProb } = await mcDropoutPredict(
      this.model!, textVec, numVec, nPasses,
    );

    // Sort by mean probability for top-3
    const classes = this.manifest!.classes;
    const sorted = Array.from(meanProbs)
      .map((p, i) => ({ category: classes[i], prob: p, std: stdProbs[i] }))
      .sort((a, b) => b.prob - a.prob);
    const top3 = sorted.slice(0, 3);
    const best = sorted[0];

    // Type: ML head, overridden by amount sign if provided
    const txType: TxType = amount !== undefined
      ? (amount >= 0 ? 'Income' : 'Expense')
      : (typeProb > 0.5 ? 'Income' : 'Expense');

    // Uncertainty gate: high MC std → Uncategorized immediately, regardless of confidence
    const unc = best.std;
    const uncThreshold = this.manifest!.inference.uncertainty_threshold;
    const confThreshold = this.manifest!.inference.per_class_thresholds[best.category]
      ?? this.manifest!.inference.global_threshold;

    const isLowConf = best.prob < confThreshold || unc > uncThreshold;

    const explanation = this.featureImportance.length > 0
      ? this.explainPrediction(textVec) : undefined;

    const r = this.result({
      category:    isLowConf ? 'Uncategorized' : best.category,
      type:        txType,
      confidence:  best.prob,
      uncertainty: unc,
      source:      isLowConf ? 'low_confidence' : 'ml',
      top3,
      explanation,
      model_version: this.manifest!.model_version,
      latency_ms:  performance.now() - t0,
    }, description);

    // Cache ML results only when confident
    if (!isLowConf) this.lru.set(cacheKey, r);
    return r;
  }

  /**
   * Batch classify — single matmul for ML tier (much faster than N sequential calls).
   */
  async classifyBatch(
    items: Array<{ description: string; amount?: number; date?: Date }>,
  ): Promise<ClassifyResult[]> {
    if (!this.ready) throw new Error('FinlyClassifier.init() not called');
    const results = new Array<ClassifyResult>(items.length);
    const mlIdxs: number[] = [];
    const mlTexts: Float32Array[] = [];
    const mlNums:  Float32Array[] = [];
    const t0 = performance.now();

    for (let i = 0; i < items.length; i++) {
      const { description, amount, date } = items[i];
      const norm = description.trim().toLowerCase();

      // cache
      const cacheKey = `${norm}|${amount ?? ''}|${date?.toISOString().slice(0,13) ?? ''}`;
      const cached = this.lru.get(cacheKey);
      if (cached) { results[i] = { ...cached, source: 'cache', latency_ms: 0 }; continue; }

      // overrides
      if (this.cfg.db) {
        try {
          const ov = await this.cfg.db.user_overrides
            .where('description_normalized').equals(norm).first();
          if (ov) {
            results[i] = this.result({ category: ov.category, type: ov.type,
              confidence: 1, uncertainty: 0, source: 'user_override',
              top3: [{ category: ov.category, prob: 1, std: 0 }], latency_ms: 0 }, description);
            continue;
          }
        } catch { /* noop */ }
      }

      // rules
      const hit = matchRule(description, this.rules);
      if (hit) {
        results[i] = this.result({ category: hit.rule.category, type: hit.rule.type,
          confidence: 0.99, uncertainty: 0, source: 'rule', rule_id: hit.rule.id,
          top3: [{ category: hit.rule.category, prob: 0.99, std: 0 }], latency_ms: 0 }, description);
        continue;
      }

      // ML
      const { textVec, numVec } = this.buildVectors(norm, amount, date);
      mlIdxs.push(i); mlTexts.push(textVec); mlNums.push(numVec);
    }

    if (mlIdxs.length > 0) {
      const TD = this.manifest!.input.text_dim;
      const ND = this.manifest!.input.numeric_dim;
      const nPasses = this.cfg.mcPasses ?? this.manifest!.inference.mc_dropout_passes;
      const M = mlIdxs.length;

      // Collect MC results per sample
      const allMean = Array.from({ length: M }, () => new Float32Array(this.manifest!.num_classes));
      const allM2   = Array.from({ length: M }, () => new Float32Array(this.manifest!.num_classes));
      const typeArr = new Float32Array(M);

      for (let pass = 0; pass < nPasses; pass++) {
        const flatT = new Float32Array(M * TD);
        const flatN = new Float32Array(M * ND);
        for (let j = 0; j < M; j++) { flatT.set(mlTexts[j], j*TD); flatN.set(mlNums[j], j*ND); }

        const probs = tf.tidy(() => {
          const tIn = tf.tensor2d(flatT, [M, TD]);
          const nIn = tf.tensor2d(flatN, [M, ND]);
          const raw = this.model!.predict([tIn, nIn], { training: true } as tf.ModelPredictConfig);
          const out = (Array.isArray(raw) ? raw : [raw]) as tf.Tensor[];
          const catP = tf.softmax(out[0]);     // category_output
          return { cat: catP.arraySync() as number[][], tp: out[1].arraySync() as number[][] };
        });

        for (let j = 0; j < M; j++) {
          const C = probs.cat[j].length;
          for (let c = 0; c < C; c++) {
            const v = probs.cat[j][c];
            allMean[j][c] += v / nPasses;
            allM2[j][c]   += v * v / nPasses;
          }
          typeArr[j] += probs.tp[j][0] / nPasses;
        }
      }

      const classes = this.manifest!.classes;
      for (let j = 0; j < M; j++) {
        const idx = mlIdxs[j];
        const mean = allMean[j];
        const std  = allM2[j].map((m2, c) => Math.sqrt(Math.max(0, m2 - mean[c]**2)));
        const sorted = Array.from(mean)
          .map((p, c) => ({ category: classes[c], prob: p, std: std[c] }))
          .sort((a, b) => b.prob - a.prob);
        const best = sorted[0];
        const tp = typeArr[j];
        const { amount, description } = items[idx];
        const txType: TxType = amount !== undefined
          ? (amount >= 0 ? 'Income' : 'Expense')
          : (tp > 0.5 ? 'Income' : 'Expense');
        const isLow = best.prob < (this.manifest!.inference.per_class_thresholds[best.category]
          ?? this.manifest!.inference.global_threshold)
          || best.std > this.manifest!.inference.uncertainty_threshold;
        results[idx] = this.result({
          category: isLow ? 'Uncategorized' : best.category,
          type: txType, confidence: best.prob, uncertainty: best.std, source: isLow ? 'low_confidence' : 'ml',
          top3: sorted.slice(0, 3), model_version: this.manifest!.model_version,
          latency_ms: (performance.now() - t0) / items.length,
        }, description);
      }
    }

    return results;
  }

  /**
   * Record a user correction.
   * Writes to user_overrides (instant future match) + feedback table (for fine-tuning).
   */
  async recordUserChoice(
    description: string,
    chosen: Category,
    chosenType: TxType,
    amount?: number,
    date?: Date,
  ): Promise<void> {
    const norm = description.trim().toLowerCase();

    if (this.cfg.db) {
      await this.cfg.db.user_overrides.put({
        description_normalized: norm,
        category: chosen, type: chosenType,
        updated_at: Date.now(), match_count: 1,
      });

      // Store feature vectors for incremental learning
      const { textVec, numVec } = this.buildVectors(norm, amount, date);
      const labelIdx = this.manifest!.classes.indexOf(chosen);
      if (labelIdx >= 0) {
        await this.cfg.db.feedback.add({
          description, description_normalized: norm,
          text_vec:    Array.from(textVec),
          numeric_vec: Array.from(numVec),
          correct_label: labelIdx,
          correct_type:  chosenType === 'Income' ? 1 : 0,
          timestamp: Date.now(),
          used_in_training: false,
        });
      }

      // Annotate telemetry
      if (this.cfg.enableTelemetry) {
        try {
          const recent = await this.cfg.db.telemetry
            .where('description').equals(description).reverse().limit(1).first();
          if (recent?.id !== undefined) {
            await this.cfg.db.telemetry.update(recent.id, { user_corrected_to: chosen });
          }
        } catch { /* noop */ }
      }
    }

    // Invalidate cache for this description
    // (we can't enumerate keys, but next classify() will miss cache and re-run)
    this.lru.clear(); // conservative: clear all — alternatively track per-description
  }

  /**
   * Incremental fine-tuning on accumulated user feedback.
   * Call from a Service Worker or background task — not on the main thread.
   *
   * Only fine-tunes the 'shared' and output layers (last 3 layers), keeping
   * the frozen TF-IDF branches stable. This is fast (<<1s) and avoids
   * catastrophic forgetting of the pre-trained representation.
   *
   * @param minSamples  minimum feedback entries before training (default 10)
   * @param epochs      fine-tune epochs (default 5)
   */
  async incrementalFineTune(minSamples = 10, epochs = 5): Promise<{ trained: boolean; n: number }> {
    if (!this.ready || !this.cfg.db) return { trained: false, n: 0 };

    const entries = await this.cfg.db.feedback
      .where('used_in_training').equals(0).toArray();  // false stored as 0 in IDB

    if (entries.length < minSamples) return { trained: false, n: entries.length };

    const TD = this.manifest!.input.text_dim;
    const ND = this.manifest!.input.numeric_dim;
    const N  = entries.length;

    const flatT    = new Float32Array(N * TD);
    const flatN    = new Float32Array(N * ND);
    const labels   = new Int32Array(N);
    const typeLabels = new Float32Array(N);

    for (let i = 0; i < N; i++) {
      flatT.set(entries[i].text_vec,    i * TD);
      flatN.set(entries[i].numeric_vec, i * ND);
      labels[i]     = entries[i].correct_label;
      typeLabels[i] = entries[i].correct_type;
    }

    // Freeze all layers except 'shared', 'category_output', 'type_output'
    const trainableNames = new Set(['shared', 'category_output', 'type_output']);
    for (const layer of this.model!.layers) {
      layer.trainable = trainableNames.has(layer.name);
    }

    this.model!.compile({
      optimizer: tf.train.adam(1e-4),
      loss: {
        category_output: 'sparseCategoricalCrossentropy',
        type_output:     'binaryCrossentropy',
      },
    } as any);

    const tIn   = tf.tensor2d(flatT, [N, TD]);
    const nIn   = tf.tensor2d(flatN, [N, ND]);
    const ycat  = tf.tensor1d(labels, 'int32');
    const ytype = tf.tensor2d(typeLabels, [N, 1]);

    await this.model!.fit([tIn, nIn], { category_output: ycat, type_output: ytype }, {
      epochs,
      batchSize: Math.min(32, N),
      verbose: 0,
    });

    tIn.dispose(); nIn.dispose(); ycat.dispose(); ytype.dispose();

    // Re-enable all layers (for future MC Dropout)
    for (const layer of this.model!.layers) layer.trainable = true;

    // Mark entries as used
    for (const e of entries) {
      if (e.id !== undefined) {
        await this.cfg.db.feedback.update(e.id, { used_in_training: true });
      }
    }

    this.lru.clear();
    console.info(`[Finly] Incremental fine-tune complete on ${N} samples`);
    return { trained: true, n: N };
  }

  /**
   * Returns which features drove the prediction (top-5 by LightGBM gain × feature activation).
   * Useful for debug UI: "Why was this classified as Продукты?"
   */
  private explainPrediction(textVec: Float32Array): string[] {
    const topN = 5;
    const scores: Array<{ name: string; score: number }> = [];
    for (const { feature, gain } of this.featureImportance.slice(0, 200)) {
      const dimIdx = this.featureIndexByName.get(feature);
      if (dimIdx === undefined) continue;
      if (dimIdx < textVec.length && textVec[dimIdx] > 0) {
        scores.push({ name: feature.replace(/^[cw]:/, ''), score: textVec[dimIdx] * gain });
      }
    }
    return scores.sort((a,b) => b.score - a.score).slice(0, topN).map(s => s.name);
  }

  private buildFeatureIndexMap(): void {
    if (!this.manifest || !this.tfidfChar || !this.tfidfWord || !this.maskData) {
      this.featureIndexByName.clear();
      return;
    }

    const rawIndexToMaskedIndex = new Map<number, number>();
    let selectedIndex = 0;
    for (let rawIndex = 0; rawIndex < this.maskData.mask.length; rawIndex++) {
      if (this.maskData.mask[rawIndex]) {
        rawIndexToMaskedIndex.set(rawIndex, selectedIndex);
        selectedIndex++;
      }
    }

    const paramsByPart = {
      char: this.tfidfChar,
      word: this.tfidfWord,
    } as const;
    const prefixByPart = {
      char: 'c:',
      word: 'w:',
    } as const;

    let offset = 0;
    this.featureIndexByName.clear();

    for (const part of this.manifest.input.concat_order) {
      const params = paramsByPart[part];
      for (const [token, rawIndex] of Object.entries(params.vocab)) {
        const concatIndex = offset + rawIndex;
        const maskedIndex = rawIndexToMaskedIndex.get(concatIndex);
        if (maskedIndex !== undefined) {
          this.featureIndexByName.set(`${prefixByPart[part]}${token}`, maskedIndex);
        }
      }
      offset += params.n_features;
    }
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private buildVectors(norm: string, amount?: number, date?: Date)
    : { textVec: Float32Array; numVec: Float32Array } {
    const charRaw = tfidfVec(norm, this.tfidfChar!);
    const wordRaw = tfidfVec(norm, this.tfidfWord!);

    // Concat in manifest-specified order
    const { char_raw_dim, word_raw_dim, concat_order } = this.manifest!.input;
    const raw = new Float32Array(char_raw_dim + word_raw_dim);
    let off = 0;
    for (const part of concat_order) {
      const src = part === 'char' ? charRaw : wordRaw;
      raw.set(src, off);
      off += src.length;
    }

    const textVec = applyMask(raw, this.maskData!.mask);
    const numVec  = numericFeatures(amount, date);
    return { textVec, numVec };
  }

  private result(r: Omit<ClassifyResult, 'model_version'> & { model_version?: string }, raw: string): ClassifyResult {
    const full: ClassifyResult = { model_version: this.manifest?.model_version, ...r };

    if (this.cfg.enableTelemetry && this.cfg.db && this.manifest) {
      this.cfg.db.telemetry.add({
        timestamp: Date.now(), description: raw,
        predicted_category: r.category, source: r.source,
        confidence: r.confidence, uncertainty: r.uncertainty,
        model_version: full.model_version ?? '',
      }).catch(() => { /* telemetry never breaks classification */ });
    }
    return full;
  }

  getManifest(): Manifest | null { return this.manifest; }
  isReady():     boolean          { return this.ready; }
  getCacheSize(): number          { return this.lru.size; }
}

// ─── Drift detection ─────────────────────────────────────────────────────────

export interface DriftReport {
  window_start:          number;
  window_end:            number;
  n_events:              number;
  source_breakdown:      Record<ClassifySource, number>;
  low_confidence_rate:   number;
  user_correction_rate:  number;
  mean_confidence:       number;
  mean_uncertainty:      number;
  top_corrections:       Array<{ from: Category; to: Category; count: number }>;
  feedback_pending:      number;    // entries not yet used in fine-tune
  alert:                 boolean;
  alert_reason?:         string;
}

export async function computeDriftReport(
  db: ClassifierDB,
  sinceMs = Date.now() - 7 * 24 * 60 * 60 * 1000,
): Promise<DriftReport> {
  const events = await db.telemetry.where('timestamp').above(sinceMs).toArray();
  const n = events.length;

  const breakdown: Record<string, number> = {};
  for (const e of events) breakdown[e.source] = (breakdown[e.source] ?? 0) + 1;

  if (n === 0) {
    return {
      window_start: sinceMs, window_end: Date.now(), n_events: 0,
      source_breakdown: breakdown as Record<ClassifySource, number>,
      low_confidence_rate: 0, user_correction_rate: 0,
      mean_confidence: 0, mean_uncertainty: 0,
      top_corrections: [], feedback_pending: 0, alert: false,
    };
  }

  const lowConf = (breakdown['low_confidence'] ?? 0) / n;
  const corrected = events.filter(e => e.user_corrected_to !== undefined);
  const corrRate = corrected.length / n;
  const meanConf = events.reduce((s, e) => s + e.confidence, 0) / n;
  const meanUnc  = events.reduce((s, e) => s + e.uncertainty, 0) / n;

  const pairMap = new Map<string, number>();
  for (const e of corrected) {
    const key = `${e.predicted_category}→${e.user_corrected_to}`;
    pairMap.set(key, (pairMap.get(key) ?? 0) + 1);
  }
  const topCorr = [...pairMap.entries()]
    .sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([k, cnt]) => {
      const [from, to] = k.split('→') as [Category, Category];
      return { from, to, count: cnt };
    });

  const pending = await db.feedback.filter(e => !e.used_in_training).toArray()
    .then(a => a.length).catch(() => 0);

  // Alert conditions
  let alert = false; let reason: string | undefined;
  if (lowConf > 0.08)   { alert = true; reason = `high low-confidence rate: ${(lowConf*100).toFixed(1)}%`; }
  if (corrRate > 0.12)  { alert = true; reason = (reason ? reason + '; ' : '') + `high correction rate: ${(corrRate*100).toFixed(1)}%`; }
  if (meanUnc > 0.20)   { alert = true; reason = (reason ? reason + '; ' : '') + `high mean uncertainty: ${meanUnc.toFixed(3)}`; }

  return {
    window_start: sinceMs, window_end: Date.now(), n_events: n,
    source_breakdown: breakdown as Record<ClassifySource, number>,
    low_confidence_rate: lowConf, user_correction_rate: corrRate,
    mean_confidence: meanConf, mean_uncertainty: meanUnc,
    top_corrections: topCorr, feedback_pending: pending,
    alert, alert_reason: reason,
  };
}

// ─── Workbox prefetch hint (call in SW install event) ───────────────────────

/**
 * Prefetch all model assets during Service Worker install.
 * This ensures the model is in the browser cache BEFORE the user opens
 * the add-transaction screen, so init() completes in ~50ms (cache hit).
 *
 * Usage in sw.ts:
 *   import { prefetchModelAssets } from './finly_runtime';
 *   self.addEventListener('install', e => e.waitUntil(prefetchModelAssets('/model/')));
 */
export async function prefetchModelAssets(modelBaseUrl: string): Promise<void> {
  const base = modelBaseUrl.replace(/\/$/, '') + '/';
  const cache = await caches.open('finly-model-v4');

  // Fetch manifest first to discover shard files dynamically
  const manifestRes = await fetch(base + 'manifest.json');
  await cache.put(base + 'manifest.json', manifestRes.clone());
  await manifestRes.json(); // consume body; manifest.json already cached above

  // Fetch model.json to discover weight shards
  const modelJsonRes = await fetch(base + 'model_predict/model.json');
  await cache.put(base + 'model_predict/model.json', modelJsonRes.clone());
  const modelJson = await modelJsonRes.json();

  // Prefetch weight shards
  const shardPaths: string[] = modelJson.weightsManifest?.flatMap(
    (g: { paths: string[] }) => g.paths.map((p: string) => base + 'model_predict/' + p)
  ) ?? [];

  const staticAssets = [
    base + 'tfidf_char.json',
    base + 'tfidf_word.json',
    base + 'feature_mask.json',
    base + 'feature_importance.json',
    base + 'classes.json',
    base + 'incremental_weights.json',
    ...shardPaths,
  ];

  await Promise.allSettled(staticAssets.map(async url => {
    if (!(await cache.match(url))) {
      try { await cache.put(url, await fetch(url)); }
      catch { /* non-critical assets */ }
    }
  }));

  console.info(`[Finly SW] Prefetched ${staticAssets.length + 2} model assets`);
}
