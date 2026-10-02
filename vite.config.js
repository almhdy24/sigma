import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { PYODIDE_CDN, PYODIDE_VERSION } from './src/lib/engine/manifest.js'

// GitHub Pages serves the app from /<repo>/; set BASE_PATH there (see the
// deploy workflow). Locally and on root-hosted platforms it stays "/".
const base = process.env.BASE_PATH || '/'

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Splits the build output into:
 *  - the initial app shell (entry chunk + its static imports + their CSS),
 *    which the service worker precaches on install, and
 *  - everything else (lazy screens, dialogs, export libraries, fonts), which
 *    is downloaded only when first used and listed in offline-assets.json so
 *    "Download everything for offline use" can cache it on demand.
 */
function offlineAssetsPlugin(shared) {
  return {
    name: 'sigma-offline-assets',
    apply: 'build',
    generateBundle(_options, bundle) {
      const initial = new Set()
      const visit = (fileName) => {
        if (initial.has(fileName)) return
        const chunk = bundle[fileName]
        if (!chunk || chunk.type !== 'chunk') return
        initial.add(fileName)
        chunk.viteMetadata?.importedCss?.forEach((css) => initial.add(css))
        chunk.imports.forEach(visit)
      }
      Object.values(bundle)
        .filter((c) => c.type === 'chunk' && c.isEntry && !c.fileName.includes('worker'))
        .forEach((c) => visit(c.fileName))

      shared.initial = initial
      const lazy = Object.keys(bundle)
        .filter((f) => !initial.has(f) && /\.(js|css|woff2|ttf)$/.test(f))
        .sort()
      this.emitFile({ type: 'asset', fileName: 'offline-assets.json', source: JSON.stringify(lazy) })
    },
  }
}

const shared = { initial: new Set() }

export default defineConfig({
  base,
  worker: { format: 'es' },
  build: {
    target: 'es2022',
    // AG Grid alone is ~1 MB minified; it is lazy-loaded with the data grid.
    chunkSizeWarningLimit: 1200,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            // Shared by every screen; a stable chunk keeps the HTTP/SW cache warm across releases.
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
          ],
        },
      },
    },
  },
  plugins: [
    react(),
    offlineAssetsPlugin(shared),
    VitePWA({
      // Ask before activating a new version so an update never reloads the
      // page in the middle of an analysis (see PwaUpdatePrompt).
      registerType: 'prompt',

      workbox: {
        // Take control on first install so engine downloads made during the
        // first visit are already served from (and stored in) the SW cache.
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest,json}'],
        globIgnores: ['offline-assets.json'],
        // Precache only the app shell; lazy chunks are runtime-cached below.
        manifestTransforms: [
          async (entries) => ({
            manifest: entries.filter(({ url }) =>
              !/\.(js|css)$/.test(url) || shared.initial.has(url)),
            warnings: [],
          }),
        ],
        runtimeCaching: [
          {
            // Hashed lazy chunks, CSS and fonts: immutable, so CacheFirst.
            // (A RegExp, not a function: functions are serialised into sw.js
            // without their closure, so they cannot reference `base`.)
            urlPattern: new RegExp(`${escapeRe(base)}assets/.+\\.(?:js|css|woff2?|ttf)$`),
            handler: 'CacheFirst',
            options: {
              cacheName: 'sigma-assets',
              expiration: { maxEntries: 300, purgeOnQuotaError: true },
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            // Python engine files (versioned URLs). Same cache name as the
            // in-app downloader (src/lib/engine/download.js) so both share it.
            urlPattern: new RegExp(`^${escapeRe(PYODIDE_CDN)}`),
            handler: 'CacheFirst',
            options: {
              cacheName: `pyodide-${PYODIDE_VERSION}`,
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },

      manifest: {
        id: './',
        name: 'Sigma — Statistical Analysis',
        short_name: 'Sigma',
        description: 'Offline-first statistical analysis workbench — descriptive stats, t-tests, ANOVA, regression, and more, running entirely in the browser without sending data to any server.',
        start_url: './',
        scope: './',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
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
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.js', 'tests/**/*.test.js'],
  },
})
