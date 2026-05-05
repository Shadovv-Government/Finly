// .lighthouserc.cjs
module.exports = {
  ci: {
    collect: {
      staticDistDir: './dist',
      numberOfRuns: 2,
    },
    assert: {
      // Вместо жёсткого preset лучше явный список
      assertions: {
        // Категории — более мягкие пороги
        'categories:performance': ['warn', { minScore: 0.6 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.8 }],
        'categories:seo': ['warn', { minScore: 0.85 }],
        'categories:pwa': ['warn', { minScore: 0.6 }],

        // Критичные фейлы, которые стоит поправить
        'errors-in-console': ['warn', { minScore: 0.9 }],
        'meta-viewport': ['warn', { minScore: 0.9 }],

        // Всё, что связано с "идеальной" оптимизацией, пока только в warn
        'unminified-javascript': ['warn', { maxLength: 10 }],
        'unused-css-rules': ['warn', { maxLength: 10 }],
        'unused-javascript': ['warn', { maxLength: 20 }],
        'valid-source-maps': ['warn', { minScore: 0.5 }],
        'legacy-javascript': ['warn', { maxLength: 5 }],
        'render-blocking-resources': ['warn', { maxLength: 5 }],
        'network-dependency-tree-insight': ['warn', { minScore: 0.3 }],

        // Core Web Vitals — просто подсвечиваем, не валим CI
        'first-contentful-paint': ['warn', { minScore: 0.2 }],
        'interactive': ['warn', { minScore: 0.2 }],
        'largest-contentful-paint': ['warn', { maxNumericValue: 13000 }],
        'speed-index': ['warn', { minScore: 0.7 }],

        // PWA‑специфика — пока только warn
        'service-worker': ['warn', { minScore: 0.5 }],
        'installable-manifest': ['warn', { minScore: 0.5 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
}