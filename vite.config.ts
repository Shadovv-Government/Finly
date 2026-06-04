import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      includeAssets: ['icon.png'],
      manifest: {
        name: 'Finly — Управление личными финансами',
        short_name: 'Finly',
        description: 'Учёт доходов и расходов с офлайн-поддержкой',
        theme_color: '#7c3aed',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        orientation: 'portrait',
        icons: [
          {
            src: 'icon.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icon.png',
            sizes: '2048x2048',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,wasm,gz}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
      },
      devOptions: {
        enabled: false,
        type: 'module',
      },
    }),
    {
      name: 'strip-csp-in-dev',
      apply: 'serve',
      transformIndexHtml: (html) => html.replace(/<meta\s+http-equiv="Content-Security-Policy"[^>]*\/?>/gi, ''),
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'modules',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@tensorflow')) {
              if (id.includes('@tensorflow/tfjs-core')) return 'vendor-tfjs-core'
              if (id.includes('@tensorflow/tfjs-backend-cpu')) return 'vendor-tfjs-backend-cpu'
              if (id.includes('@tensorflow/tfjs-backend-webgl')) return 'vendor-tfjs-backend-webgl'
              if (id.includes('@tensorflow/tfjs-converter')) return 'vendor-tfjs-converter'
              if (id.includes('@tensorflow/tfjs-layers')) return 'vendor-tfjs-layers'
              return 'vendor-tfjs'
            }

            if (id.includes('@mui') || id.includes('@emotion')) {
              return 'vendor-mui'
            }

            if (id.includes('recharts') || id.includes('chart.js') || id.includes('react-chartjs-2')) {
              return 'vendor-charts'
            }

            if (id.includes('dexie')) return 'vendor-dexie'

            if (id.includes('@radix-ui')) return 'vendor-radix'

            if (id.includes('tesseract')) return 'vendor-tesseract'

            if (id.includes('motion') || id.includes('framer-motion')) return 'vendor-motion'

            if (id.includes('date-fns')) return 'vendor-date'

            if (id.includes('lucide-react')) return 'vendor-icons'

            if (
              id.includes('react-router') ||
              id.includes('react-router-dom') ||
              id.includes('react-dom') ||
              id.endsWith(`${path.sep}react${path.sep}index.js`)
            ) {
              return 'vendor-react'
            }

            if (id.includes('workbox')) return 'vendor-sw'
            if (id.includes('zustand')) return 'vendor-state'
          }
        },
      },
    },
  },
})