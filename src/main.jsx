import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Two weights only: 500 renders with 400 and 700 with 600 (nearest match).
import '@fontsource/ibm-plex-sans-arabic/400.css'
import '@fontsource/ibm-plex-sans-arabic/600.css'
import './index.css'
import { loadInitialLanguage } from './i18n/i18n.js'
import App from './App.jsx'

// A lazily-loaded chunk can disappear after a new deployment (its hash
// changed). Reload once to pick up the new build instead of failing.
window.addEventListener('vite:preloadError', (event) => {
  const KEY = 'sigma-preload-reload'
  try {
    if (navigator.onLine && !sessionStorage.getItem(KEY)) {
      sessionStorage.setItem(KEY, '1')
      event.preventDefault()
      window.location.reload()
    }
  } catch { /* storage unavailable: let the error boundary handle it */ }
})
// Allow another recovery reload later in this session once the app is up.
setTimeout(() => { try { sessionStorage.removeItem('sigma-preload-reload') } catch { /* ignore */ } }, 10_000)

// Fetch only the active language's strings before the first render.
await loadInitialLanguage()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
