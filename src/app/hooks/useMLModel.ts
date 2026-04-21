import { useCallback, useEffect, useState } from 'react';
import { FinlyClassifier, type Category, type ClassifyResult } from '../../lib/classifier/finly_runtime';
import { createClassifierDB } from '../../lib/classifier/finly_db';

export interface MLClassifyResult {
  categoryName: string;
  type: 'income' | 'expense';
  confidence: number;
  uncertainty: number;
  source: string;
  top3: Array<{ categoryName: string; prob: number }>;
}

// Module-level singleton — one classifier shared across all hook instances
let sharedClassifier: FinlyClassifier | null = null;
let sharedInitPromise: Promise<void> | null = null;

// Register SW message listener once at module load
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event: MessageEvent) => {
    if (event.data?.type !== 'RUN_FINE_TUNE') return;
    const { minSamples = 10, epochs = 5 } = event.data;
    // Run in main thread where WebGL is available — fire-and-forget
    setTimeout(async () => {
      const clf = await getSharedClassifier();
      if (!clf) return;
      try {
        const result = await clf.incrementalFineTune(minSamples, epochs);
        if (result.trained) {
          console.info(`[Finly] Fine-tune complete: ${result.n} samples`);
          event.source?.postMessage?.({ type: 'FINE_TUNE_DONE', result });
        }
      } catch (e) {
        console.warn('[Finly] Fine-tune failed:', e);
      }
    }, 0);
  });
}

async function requestFineTuneSync(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    // @ts-ignore — Background Sync API not yet in TS lib
    if (reg.sync) await reg.sync.register('finly-fine-tune');
  } catch { /* not supported or SW not yet active */ }
}

async function getSharedClassifier(): Promise<FinlyClassifier | null> {
  if (sharedClassifier?.isReady()) return sharedClassifier;

  if (!sharedInitPromise) {
    const db = createClassifierDB();
    sharedClassifier = new FinlyClassifier({
      modelBaseUrl: '/model/',
      db,
      cacheSize: 500,
      enableTelemetry: true,
    });
    sharedInitPromise = sharedClassifier.init().catch(e => {
      console.warn('[ML] init failed:', e);
      sharedClassifier = null;
      sharedInitPromise = null;
      throw e;
    });
  }

  try {
    await sharedInitPromise;
    return sharedClassifier;
  } catch {
    return null;
  }
}

function mapResult(r: ClassifyResult): MLClassifyResult {
  return {
    categoryName: r.category,
    type: r.type === 'Income' ? 'income' : 'expense',
    confidence: r.confidence,
    uncertainty: r.uncertainty,
    source: r.source,
    top3: r.top3.map(t => ({ categoryName: t.category, prob: t.prob })),
  };
}

interface UseMLModelOptions {
  autoLoad?: boolean;
}

export function useMLModel({ autoLoad = true }: UseMLModelOptions = {}) {
  const [ready, setReady] = useState(() => !!sharedClassifier?.isReady());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!autoLoad) return;
    getSharedClassifier().then(clf => {
      if (clf) setReady(true);
      else setError('ML модель недоступна — используется rule-based matching');
    });
  }, [autoLoad]);

  const ensureReady = useCallback(async () => {
    const clf = await getSharedClassifier();
    if (clf) { setReady(true); return true; }
    setError('ML модель недоступна — используется rule-based matching');
    return false;
  }, []);

  const classify = useCallback(async (
    text: string,
    amount?: number,
    date?: Date,
  ): Promise<MLClassifyResult | null> => {
    const clf = await getSharedClassifier();
    if (!clf) return null;
    try {
      const r = await clf.classify(text, amount, date);
      if (r.category === 'Uncategorized') return null;
      return mapResult(r);
    } catch {
      return null;
    }
  }, []);

  const recordUserChoice = useCallback(async (
    description: string,
    categoryName: string,
    type: 'income' | 'expense',
    amount?: number,
    date?: Date,
  ): Promise<void> => {
    const clf = await getSharedClassifier();
    if (!clf) return;
    try {
      await clf.recordUserChoice(
        description,
        categoryName as Category,
        type === 'income' ? 'Income' : 'Expense',
        amount,
        date,
      );
      // Register background sync after every correction — browser deduplicates the tag,
      // and incrementalFineTune() checks minSamples internally before doing anything.
      requestFineTuneSync();
    } catch { /* noop — feedback is best-effort */ }
  }, []);

  return { ready, error, classify, ensureReady, recordUserChoice };
}

export async function ensureMLModelReady(): Promise<boolean> {
  return !!(await getSharedClassifier());
}

export async function classifyOnce(
  text: string,
  amount?: number,
  date?: Date,
): Promise<MLClassifyResult | null> {
  const clf = await getSharedClassifier();
  if (!clf) return null;
  try {
    const r = await clf.classify(text, amount, date);
    if (r.category === 'Uncategorized') return null;
    return mapResult(r);
  } catch {
    return null;
  }
}
