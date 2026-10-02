import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/ibm-plex-sans-arabic/300.css'
import '@fontsource/ibm-plex-sans-arabic/400.css'
import '@fontsource/ibm-plex-sans-arabic/500.css'
import '@fontsource/ibm-plex-sans-arabic/600.css'
import './index.css'
import './i18n/i18n.js'
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

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
