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

// ─── TF-IDF трансформ (реплика Python TfidfVectorizer) ──────────────────────
function tfidfTransform(text: string, params: TFIDFParams): Float32Array {
  const { vocab, idf, ngram_range, max_features, sublinear_tf } = params;
  const [minN, maxN] = ngram_range;
  const counts: Record<string, number> = {};
  let total = 0;

  for (let n = minN; n <= maxN; n++) {
    for (const gram of charNgrams(text.toLowerCase(), n)) {
      if (Object.prototype.hasOwnProperty.call(vocab, gram)) {
        counts[gram] = (counts[gram] ?? 0) + 1;
        total++;
      }
    }
  }
  if (total === 0) total = 1;

  const vector = new Float32Array(max_features);
  for (const [gram, cnt] of Object.entries(counts)) {
    const idx = vocab[gram];
    if (idx !== undefined) {
      const tf = sublinear_tf ? Math.log(1 + cnt / total) : cnt / total;
      vector[idx] = tf * idf[idx];
    }
  }

  // L2 normalize
  let norm = 0;
  for (const v of vector) norm += v * v;
  norm = Math.sqrt(norm) || 1;
  return vector.map(v => v / norm);
}

async function loadModel(): Promise<void> {
  const tf = await import('@tensorflow/tfjs');
  const [model, tfidf, classMap] = await Promise.all([
    tf.loadLayersModel('/model/model.json'),
    fetch('/model/tfidf_params.json').then(r => r.json() as Promise<TFIDFParams>),
    fetch('/model/class_mapping.json').then(r => r.json() as Promise<ClassMap>),
  ]);
  cachedTF = tf;
  cachedModel = model;
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

      const vec = tfidfTransform(text, cachedTFIDF);
      const input = cachedTF.tensor2d([Array.from(vec)]);
      const output = cachedModel.predict(input) as unknown as Record<string, TFType.Tensor>;

      const catProbs = Array.from(output['category_output'].dataSync() as Float32Array);
      const typeProb = output['type_output'].dataSync()[0];

      input.dispose();
      output['category_output'].dispose();
      output['type_output'].dispose();

      const catIdx = catProbs.indexOf(Math.max(...catProbs));
      const categoryName = cachedClassMap[String(catIdx)] ?? '';
      const type: 'income' | 'expense' = typeProb > 0.5 ? 'income' : 'expense';
      const confidence = catProbs[catIdx];

      const top3 = catProbs
        .map((p, i) => ({ categoryName: cachedClassMap![String(i)] ?? '', prob: p }))
        .sort((a, b) => b.prob - a.prob)
        .slice(0, 3);

      return { categoryName, type, confidence, top3 };
    },
    [ready], // eslint-disable-line react-hooks/exhaustive-deps
  );

  return { ready, error, classify };
}
