import { describe, expect, it } from 'vitest';
import { FinlyClassifier } from './finly_runtime';

describe('FinlyClassifier explainPrediction', () => {
  it('maps feature importance names to selected feature indexes', () => {
    const classifier = new FinlyClassifier({ modelBaseUrl: '/model' }) as any;

    classifier.manifest = {
      input: {
        concat_order: ['char', 'word'],
      },
    };
    classifier.tfidfChar = {
      n_features: 1,
      vocab: {
        'аб': 0,
      },
    };
    classifier.tfidfWord = {
      n_features: 1,
      vocab: {
        продукты: 0,
      },
    };
    classifier.maskData = {
      mask: [true, true],
    };
    classifier.featureImportance = [
      { feature: 'w:продукты', gain: 2 },
      { feature: 'c:аб', gain: 1 },
    ];
    classifier.buildFeatureIndexMap();

    const explanation = classifier.explainPrediction(new Float32Array([0.5, 3]));

    expect(explanation).toEqual(['продукты', 'аб']);
  });
});
