export default {
  ci: {
    collect: {
      staticDistDir: './dist',
      numberOfRuns: 2,
    },
    assert: {
      preset: 'lighthouse:no-pwa',
      assertions: {
        'categories:performance':    ['warn',  { minScore: 0.8 }],
        'categories:accessibility':  ['error', { minScore: 0.9 }],
        'categories:best-practices': ['warn',  { minScore: 0.85 }],
        'categories:seo':            ['warn',  { minScore: 0.9 }],
        'categories:pwa':            ['warn',  { minScore: 0.7 }],
        'largest-contentful-paint':  ['warn',  { maxNumericValue: 3000 }],
        'cumulative-layout-shift':   ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time':       ['warn',  { maxNumericValue: 300 }],
        'service-worker':            ['warn',  { minScore: 1 }],
        'installable-manifest':      ['warn',  { minScore: 1 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};