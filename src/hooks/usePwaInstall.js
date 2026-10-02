import { useState, useEffect } from 'react';

const DISMISS_KEY = 'sigma-pwa-install-dismissed';
const DISMISS_TTL = 14 * 24 * 60 * 60 * 1000; // 14 days

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    navigator.standalone === true
  );
}

function isIosSafari() {
  const ua = navigator.userAgent;
  return (
    /iP(hone|ad|od)/i.test(ua) &&
    /WebKit/i.test(ua) &&
    !/CriOS|FxiOS|OPiOS|mercury/i.test(ua)
  );
}

function wasDismissedRecently() {
  try {
    const ts = localStorage.getItem(DISMISS_KEY);
    return ts ? Date.now() - Number(ts) < DISMISS_TTL : false;
  } catch {
    return false;
  }
}

function recordDismissal() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch { /* storage unavailable */ }
}

export default function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner]         = useState(false);
  // iOS Safari never fires beforeinstallprompt; detect it once up front.
  const [isIos] = useState(() => typeof navigator !== 'undefined' && isIosSafari());

  useEffect(() => {
    if (isStandalone() || wasDismissedRecently()) return;

    let showTimer = null;

    if (isIos) {
      // iOS Safari never fires beforeinstallprompt — show manual instructions
      showTimer = setTimeout(() => setShowBanner(true), 12_000);
      return () => clearTimeout(showTimer);
    }

    const handler = (e) => {
      e.preventDefault(); // suppress the browser's native mini-bar
      setDeferredPrompt(e);
      showTimer = setTimeout(() => setShowBanner(true), 12_000);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      clearTimeout(showTimer);
    };
  }, [isIos]);

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setShowBanner(false);
    if (outcome === 'dismissed') recordDismissal();
    // 'accepted' → app installs; no dismissal timestamp needed
  };

  const dismiss = () => {
    setShowBanner(false);
    recordDismissal();
  };

  return { showBanner, isIos, install, dismiss };
}
