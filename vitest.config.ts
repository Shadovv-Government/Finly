import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
      include: ['src/**/*.{test,spec}.{ts,tsx}'],
      exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json-summary', 'json', 'html'],
        include: ['src/**/*.{ts,tsx}'],
        exclude: [
          'src/**/*.d.ts',
          'src/**/*.{test,spec}.{ts,tsx}',
          'src/test/**',
          'src/main.tsx',
          'src/app/routes.tsx',
          'src/app/App.tsx',
          'src/app/Layout.tsx',
          'src/db/seed.ts',
          'src/db/exportImport.ts',
        ],
        thresholds: {
          global: {
            branches: 50,
            functions: 50,
            lines: 50,
            statements: 50,
          },
        },
      },
    },
  })
)