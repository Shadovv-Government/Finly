import { useCallback, useEffect, useState } from 'react';
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

let cachedTF: typeof TFType | null = null;
let cachedModel: TFType.LayersModel | null = null;
let cachedTFIDF: TFIDFParams | null = null;
let cachedClassMap: ClassMap | null = null;
let loadPromise: Promise<void> | null = null;

function charNgrams(text: string, n: number): string[] {
  const grams: string[] = [];

  for (const word of text.split(/\s+/)) {
    if (!word) continue;

    const padded = ` ${word} `;
    for (let i = 0; i <= padded.length - n; i += 1) {
      grams.push(padded.slice(i, i + n));
    }
  }

  return grams;
}

function tfidfTransform(text: string, params: TFIDFParams): Float32Array {
  const { vocab, idf, ngram_range, max_features, sublinear_tf } = params;
  const [minN, maxN] = ngram_range;
  const counts: Record<string, number> = {};

  for (let n = minN; n <= maxN; n += 1) {
    for (const gram of charNgrams(text.toLowerCase(), n)) {
      if (Object.prototype.hasOwnProperty.call(vocab, gram)) {
        counts[gram] = (counts[gram] ?? 0) + 1;
      }
    }
  }

  const vector = new Float32Array(max_features);
  for (const [gram, count] of Object.entries(counts)) {
    const index = vocab[gram];
    if (index !== undefined) {
      const termFrequency = sublinear_tf ? 1 + Math.log(count) : count;
      vector[index] = termFrequency * idf[index];
    }
  }

  let norm = 0;
  for (const value of vector) norm += value * value;

  norm = Math.sqrt(norm) || 1;
  return vector.map(value => value / norm);
}

function patchKeras3ToTfjs<T extends Record<string, any>>(modelJson: T): T {
  const topology = modelJson?.modelTopology?.model_config?.config;
  if (!topology) return modelJson;

  if (Array.isArray(topology.layers)) {
    for (const layer of topology.layers) {
      const config = layer?.config;

      if (config?.batch_shape && config.batch_input_shape == null) {
        config.batch_input_shape = config.batch_shape;
        delete config.batch_shape;
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
              const history = arg?.config?.keras_history;
              return history ? [history[0], history[1] ?? 0, history[2] ?? 0, call.kwargs ?? {}] : null;
            })
            .filter(Boolean);
        });
      }

      if (config) {
        for (const key of ['kernel_regularizer', 'bias_regularizer', 'activity_regularizer']) {
          const regularizer = config[key];

          if (regularizer?.class_name === 'L2') {
            config[key] = { class_name: 'L1L2', config: { l1: 0, l2: regularizer.config?.l2 ?? 0 } };
          } else if (regularizer?.class_name === 'L1') {
            config[key] = { class_name: 'L1L2', config: { l1: regularizer.config?.l1 ?? 0, l2: 0 } };
          }
        }
      }
    }
  }

  if (topology.input_layers && !Array.isArray(topology.input_layers[0])) {
    topology.input_layers = [topology.input_layers];
  }

  if (topology.output_layers && !Array.isArray(topology.output_layers)) {
    topology.output_layers = Object.values(topology.output_layers);
  }

  return modelJson;
}

async function loadModel(): Promise<void> {
  const tf = await import('@tensorflow/tfjs');
  const [modelJsonRaw, tfidf, classMap] = await Promise.all([
    fetch('/model/model.json').then(response => response.json()),
    fetch('/model/tfidf_params.json').then(response => response.json() as Promise<TFIDFParams>),
    fetch('/model/class_mapping.json').then(response => response.json() as Promise<ClassMap>),
  ]);

  const modelJson = patchKeras3ToTfjs(modelJsonRaw);
  const manifest: Array<{ paths: string[]; weights: any[] }> = modelJson.weightsManifest ?? [];
  const weightSpecs: any[] = [];
  const buffers: ArrayBuffer[] = [];

  for (const group of manifest) {
    for (const spec of group.weights) weightSpecs.push(spec);
    for (const path of group.paths) {
      const buffer = await fetch(`/model/${path}`).then(response => response.arrayBuffer());
      buffers.push(buffer);
    }
  }

  const totalLength = buffers.reduce((sum, buffer) => sum + buffer.byteLength, 0);
  const mergedBuffer = new Uint8Array(totalLength);
  let offset = 0;

  for (const buffer of buffers) {
    mergedBuffer.set(new Uint8Array(buffer), offset);
    offset += buffer.byteLength;
  }

  const handler = tf.io.fromMemory({
    modelTopology: modelJson.modelTopology,
    weightSpecs,
    weightData: mergedBuffer.buffer,
    format: modelJson.format,
    generatedBy: modelJson.generatedBy,
    convertedBy: modelJson.convertedBy,
  });

  cachedTF = tf;
  cachedModel = await tf.loadLayersModel(handler);
  cachedTFIDF = tfidf;
  cachedClassMap = classMap;
}

async function ensureModelLoaded(): Promise<boolean> {
  if (cachedModel) {
    return true;
  }

  if (!loadPromise) {
    loadPromise = loadModel();
  }

  try {
    await loadPromise;
    return true;
  } catch {
    loadPromise = null;
    return false;
  }
}

interface UseMLModelOptions {
  autoLoad?: boolean;
}

export function useMLModel({ autoLoad = true }: UseMLModelOptions = {}) {
  const [ready, setReady] = useState(!!cachedModel);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!autoLoad) {
      return;
    }

    ensureModelLoaded().then((loaded) => {
      if (loaded) {
        setReady(true);
      } else {
        setError('ML модель недоступна — используется rule-based matching');
      }
    });
  }, [autoLoad]);

  const ensureReady = useCallback(async () => {
    const loaded = await ensureModelLoaded();
    if (loaded) {
      setReady(true);
      return true;
    }

    setError('ML модель недоступна — используется rule-based matching');
    return false;
  }, []);

  const classify = useCallback((text: string): MLClassifyResult | null => {
    return classifyWithMLModel(text);
  }, []);

  return { ready, error, classify, ensureReady };
}

export async function ensureMLModelReady() {
  return ensureModelLoaded();
}

export function classifyWithMLModel(text: string) {
  if (!cachedTF || !cachedModel || !cachedTFIDF || !cachedClassMap) {
    return null;
  }

  try {
    const vector = tfidfTransform(text, cachedTFIDF);
    const nonZeroFeatures = vector.filter(value => value !== 0).length;
    if (nonZeroFeatures === 0) {
      return null;
    }

    const input = cachedTF.tensor2d([Array.from(vector)]);
    const rawPrediction = cachedModel.predict(input);
    const outputs = (Array.isArray(rawPrediction) ? rawPrediction : [rawPrediction]) as TFType.Tensor[];
    const categoryTensor = outputs[0];
    const typeTensor = outputs[1];

    const categoryProbabilities = Array.from(categoryTensor.dataSync() as Float32Array);
    const typeProbability = typeTensor.dataSync()[0];

    input.dispose();
    categoryTensor.dispose();
    typeTensor?.dispose();

    const categoryIndex = categoryProbabilities.indexOf(Math.max(...categoryProbabilities));
    const categoryName = cachedClassMap[String(categoryIndex)] ?? '';
    const type: 'income' | 'expense' = typeProbability > 0.5 ? 'income' : 'expense';
    const confidence = categoryProbabilities[categoryIndex];

    const top3 = categoryProbabilities
      .map((probability, index) => ({
        categoryName: cachedClassMap![String(index)] ?? '',
        prob: probability,
      }))
      .sort((a, b) => b.prob - a.prob)
      .slice(0, 3);

    return { categoryName, type, confidence, top3 };
  } catch (err) {
    console.error('[ML] classify error:', err);
    return null;
  }
}
