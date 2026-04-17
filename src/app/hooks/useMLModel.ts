// src/app/hooks/useMLModel.ts
// TF.js inference hook — загружает модель из /public/model/ один раз, кэширует глобально

import { useState, useEffect, useCallback } from 'react';
import type * as TFType from '@tensorflow/tfjs';

interface TFIDFParams {
  vocab: Record<string, number>;
  idf: number[];
  ngram_range: [number, number];
  max_features: number;
  sublinear_tf: boolean;
}

interface ClassMap {
  [key: string]: string;
}

export interface MLClassifyResult {
  categoryName: string;
  type: 'income' | 'expense';
  confidence: number;
  top3: Array<{ categoryName: string; prob: number }>;
}

// Модуль-уровневый кэш — не перезагружаем при ремаунтах
let cachedTF: typeof TFType | null = null;
let cachedModel: TFType.LayersModel | null = null;
let cachedTFIDF: TFIDFParams | null = null;
let cachedClassMap: ClassMap | null = null;
let loadPromise: Promise<void> | null = null;

// ─── Char n-gram генератор (char_wb: пробелы как границы слов) ───────────────
function charNgrams(text: string, n: number): string[] {
  const grams: string[] = [];
  for (const word of text.split(/\s+/)) {
    if (!word) continue;
    const padded = ' ' + word + ' ';
    for (let i = 0; i <= padded.length - n; i++) {
      grams.push(padded.slice(i, i + n));
    }
  }
  return grams;
}

// ─── TF-IDF трансформ — точная реплика sklearn TfidfVectorizer ───────────────
// sklearn с sublinear_tf=True: tf = 1 + log(raw_count), затем умножить на idf,
// затем L2-нормализация. НЕ делить count на длину документа — это ошибка
// в JS-сниппете из ноутбука.
function tfidfTransform(text: string, params: TFIDFParams): Float32Array {
  const { vocab, idf, ngram_range, max_features, sublinear_tf } = params;
  const [minN, maxN] = ngram_range;
  const counts: Record<string, number> = {};

  for (let n = minN; n <= maxN; n++) {
    for (const gram of charNgrams(text.toLowerCase(), n)) {
      if (Object.prototype.hasOwnProperty.call(vocab, gram)) {
        counts[gram] = (counts[gram] ?? 0) + 1;
      }
    }
  }

  const vector = new Float32Array(max_features);
  for (const [gram, cnt] of Object.entries(counts)) {
    const idx = vocab[gram];
    if (idx !== undefined) {
      // sklearn sublinear_tf: replace tf with 1 + log(tf), natural log
      const tf = sublinear_tf ? 1 + Math.log(cnt) : cnt;
      vector[idx] = tf * idf[idx];
    }
  }

  // L2 normalize
  let norm = 0;
  for (const v of vector) norm += v * v;
  norm = Math.sqrt(norm) || 1;
  return vector.map(v => v / norm);
}

// ─── Patch model.json: Keras 3.13 → TF.js Layers 4.x ────────────────────────
// tfjs-converter 4.22 НЕ умеет конвертировать Keras 3 формат, и из-за этого
// loadLayersModel падает молча в catch → mlReady=false → ML вообще не работает,
// а UI скатывается на первую expense-категорию (= "Еда" в seed). Чиним 4 вещи:
//   1) InputLayer.config.batch_shape          → batch_input_shape
//   2) inbound_nodes [{args, kwargs}, ...]    → [[[layer, n_idx, t_idx, kw]]]
//   3) input_layers [name, 0, 0]              → [[name, 0, 0]]
//      output_layers {name: [...]}            → [[name, 0, 0], ...]
//   4) regularizer L1 / L2 (Keras 3 классы)   → составной L1L2 (TF.js)
function patchKeras3ToTfjs<T extends Record<string, any>>(modelJson: T): T {
  const topo = modelJson?.modelTopology?.model_config?.config;
  if (!topo) return modelJson;

  if (Array.isArray(topo.layers)) {
    for (const layer of topo.layers) {
      const cfg = layer?.config;
      if (cfg?.batch_shape && cfg.batch_input_shape == null) {
        cfg.batch_input_shape = cfg.batch_shape;
        delete cfg.batch_shape;
      }
      if (
        Array.isArray(layer?.inbound_nodes) &&
        layer.inbound_nodes.length > 0 &&
        !Array.isArray(layer.inbound_nodes[0])
      ) {
        layer.inbound_nodes = layer.inbound_nodes.map((call: any) => {
          const args = Array.isArray(call?.args) ? call.args : [];
          return args
            .map((arg: any) => {
              const hist = arg?.config?.keras_history;
              return hist ? [hist[0], hist[1] ?? 0, hist[2] ?? 0, call.kwargs ?? {}] : null;
            })
            .filter(Boolean);
        });
      }
      if (cfg) {
        for (const k of ['kernel_regularizer', 'bias_regularizer', 'activity_regularizer']) {
          const r = cfg[k];
          if (r?.class_name === 'L2') {
            cfg[k] = { class_name: 'L1L2', config: { l1: 0, l2: r.config?.l2 ?? 0 } };
          } else if (r?.class_name === 'L1') {
            cfg[k] = { class_name: 'L1L2', config: { l1: r.config?.l1 ?? 0, l2: 0 } };
          }
        }
      }
    }
  }
  if (topo.input_layers && !Array.isArray(topo.input_layers[0])) {
    topo.input_layers = [topo.input_layers];
  }
  if (topo.output_layers && !Array.isArray(topo.output_layers)) {
    topo.output_layers = Object.values(topo.output_layers);
  }
  return modelJson;
}

async function loadModel(): Promise<void> {
  const tf = await import('@tensorflow/tfjs');

  // Грузим JSON отдельно, чтобы пропатчить его перед deserialize.
  // Бинарные шарды весов прокидываем через io.fromMemory — оригинальные
  // файлы в /public/model/* не трогаем.
  const [modelJsonRaw, tfidf, classMap] = await Promise.all([
    fetch('/model/model.json').then(r => r.json()),
    fetch('/model/tfidf_params.json').then(r => r.json() as Promise<TFIDFParams>),
    fetch('/model/class_mapping.json').then(r => r.json() as Promise<ClassMap>),
  ]);
  const modelJson = patchKeras3ToTfjs(modelJsonRaw);

  const manifest: Array<{ paths: string[]; weights: any[] }> = modelJson.weightsManifest ?? [];
  const weightSpecs: any[] = [];
  const buffers: ArrayBuffer[] = [];
  for (const group of manifest) {
    for (const spec of group.weights) weightSpecs.push(spec);
    for (const p of group.paths) {
      const buf = await fetch(`/model/${p}`).then(r => r.arrayBuffer());
      buffers.push(buf);
    }
  }
  const total = buffers.reduce((s, b) => s + b.byteLength, 0);
  const merged = new Uint8Array(total);
  let off = 0;
  for (const b of buffers) {
    merged.set(new Uint8Array(b), off);
    off += b.byteLength;
  }

  const handler = tf.io.fromMemory({
    modelTopology: modelJson.modelTopology,
    weightSpecs,
    weightData: merged.buffer,
    format: modelJson.format,
    generatedBy: modelJson.generatedBy,
    convertedBy: modelJson.convertedBy,
  });

  cachedTF = tf;
  cachedModel = await tf.loadLayersModel(handler);
  cachedTFIDF = tfidf;
  cachedClassMap = classMap;
}

export function useMLModel() {
  const [ready, setReady] = useState(!!cachedModel);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cachedModel) return;

    if (!loadPromise) {
      loadPromise = loadModel();
    }

    loadPromise
      .then(() => setReady(true))
      .catch(() => {
        setError('ML модель недоступна — используется rule-based matching');
        loadPromise = null; // разрешаем повторную попытку
      });
  }, []);

  // Синхронный вывод (dataSync()) — допустимо для маленьких моделей
  const classify = useCallback(
    (text: string): MLClassifyResult | null => {
      if (!cachedTF || !cachedModel || !cachedTFIDF || !cachedClassMap) return null;

      try {
        const vec = tfidfTransform(text, cachedTFIDF);
        const nonZero = vec.filter(v => v !== 0).length;
        // console.log(`[ML] input: "${text}" → non-zero features: ${nonZero}/${vec.length}`);

        if (nonZero === 0) {
          // console.warn('[ML] вектор полностью нулевой — текст не содержит знакомых n-gram. На таком входе модель имеет bias к "Еда" → возвращаем null.');
          return null;
        }

        const input = cachedTF.tensor2d([Array.from(vec)]);
        // TF.js возвращает Tensor[] для multi-output моделей, не NamedTensorMap
        const raw = cachedModel.predict(input);
        const outputs = (Array.isArray(raw) ? raw : [raw]) as TFType.Tensor[];
        const catTensor  = outputs[0]; // category_output
        const typeTensor = outputs[1]; // type_output

        const catProbs = Array.from(catTensor.dataSync() as Float32Array);
        const typeProb = typeTensor.dataSync()[0];

        input.dispose();
        catTensor.dispose();
        typeTensor?.dispose();

        const catIdx = catProbs.indexOf(Math.max(...catProbs));
        const categoryName = cachedClassMap[String(catIdx)] ?? '';
        const type: 'income' | 'expense' = typeProb > 0.5 ? 'income' : 'expense';
        const confidence = catProbs[catIdx];

        const top3 = catProbs
          .map((p, i) => ({ categoryName: cachedClassMap![String(i)] ?? '', prob: p }))
          .sort((a, b) => b.prob - a.prob)
          .slice(0, 3);

        // console.log(`[ML] результат: ${categoryName} (${(confidence * 100).toFixed(1)}%) | type: ${type} (${(typeProb * 100).toFixed(1)}%)`);
        // console.log('[ML] top-3:', top3.map(t => `${t.categoryName} ${(t.prob * 100).toFixed(1)}%`).join(', '));

        return { categoryName, type, confidence, top3 };
      } catch (e) {
        console.error('[ML] classify error:', e);
        return null;
      }
    },
    [ready], // eslint-disable-line react-hooks/exhaustive-deps
  );

  return { ready, error, classify };
}
