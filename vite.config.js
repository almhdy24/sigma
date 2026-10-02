import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const PYODIDE_CDN = 'https://cdn.jsdelivr.net'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',

      // vite-plugin-pwa precaches everything Vite emits by default
      // (js, css, html, png, svg, woff2…). No override needed.
      workbox: {
        // navigateFallback: safety net for any URL variant while offline.
        // The full app shell (index.html + all JS/CSS) is precached, so
        // navigating to the app root while offline is already covered by the
        // precache handler. This line covers edge-case URLs that don't appear
        // in the precache manifest (e.g. /some/deep/path typed directly).
        // Since the app has no client-side router, all valid app URLs are "/",
        // but this ensures a graceful fallback in every browser.
        navigateFallback: '/index.html',

        // Pyodide WASM/wheel/data files are fetched at runtime from the CDN
        // and are NOT in the Vite build output, so precaching can't cover them.
        // We use a CacheFirst runtime rule instead.
        //
        // Size context:
        //   pyodide.asm.wasm  ~10 MB
        //   numpy wheel        ~4 MB
        //   scipy wheel       ~30 MB
        //   plus .js loader, stdlib, etc. — total first load ~55–70 MB
        //
        // CacheFirst is correct: these files are content-addressed (versioned
        // in the URL path) so a cache hit is always valid. maxEntries 80
        // covers all individual Pyodide/numpy/scipy assets with room to spare.
        // maxAgeSeconds 1 year matches the CDN's own immutable cache headers.
        //
        // cacheableResponse { statuses: [0, 200] } allows opaque cross-origin
        // responses (status 0 from no-cors requests) to be stored; without
        // this, many CDN assets are silently dropped by the Cache API.
        runtimeCaching: [
          {
            urlPattern: new RegExp(`^${PYODIDE_CDN}/pyodide/`),
            handler: 'CacheFirst',
            options: {
              cacheName: 'pyodide-cdn-v1',
              expiration: {
                maxEntries: 80,
                maxAgeSeconds: 31_536_000,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },

      manifest: {
        name: 'Sigma — Statistical Analysis',
        short_name: 'Sigma',
        description: 'Offline-first statistical analysis workbench — descriptive stats, t-tests, ANOVA, regression, and more, running entirely in the browser without sending data to any server.',
        start_url: '/',
        display: 'standalone',
        // orientation intentionally absent — not locked, works in portrait and landscape
        background_color: '#f2f5f8',
        theme_color: '#1f5fa6',
        // lang/dir describe the manifest text content (Arabic default).
        // They affect installer metadata only — not the runtime UI direction,
        // which is controlled by the app's own i18n toggle and document.dir.
        lang: 'ar',
        dir: 'rtl',
        categories: ['education', 'productivity', 'utilities'],
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
})
