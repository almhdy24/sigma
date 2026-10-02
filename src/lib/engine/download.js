// Downloads engine files into Cache Storage with byte-level progress.
// The service worker serves the same cache (CacheFirst), so files fetched
// here are reused by Pyodide and remain available offline.
import { ENGINE_CACHE } from './plan.js';

async function openCache() {
  try {
    return typeof caches !== 'undefined' ? await caches.open(ENGINE_CACHE) : null;
  } catch {
    return null; // e.g. private mode / insecure context
  }
}

/** Remove caches left behind by older engine versions. */
export async function purgeOldEngineCaches() {
  try {
    if (typeof caches === 'undefined') return;
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((k) => (k.startsWith('pyodide-') && k !== ENGINE_CACHE))
        .map((k) => caches.delete(k)),
    );
  } catch { /* storage unavailable */ }
}

/** True when every URL is present in the engine cache. */
export async function areCached(urls) {
  const cache = await openCache();
  if (!cache) return false;
  try {
    const hits = await Promise.all(urls.map((u) => cache.match(u)));
    return hits.every(Boolean);
  } catch {
    return false;
  }
}

/**
 * Fetch `files` ({ url, bytes }) with progress. Already-cached files count as
 * complete immediately. `onProgress({ loaded, total })` totals are refined
 * with Content-Length as responses arrive.
 */
export async function downloadFiles(files, { onProgress, signal, concurrency = 4, fetchImpl = fetch } = {}) {
  const cache = await openCache();
  const state = files.map((f) => ({ expected: f.bytes, received: 0 }));
  const report = () => {
    let loaded = 0;
    let total = 0;
    for (const s of state) {
      total += Math.max(s.expected, s.received);
      loaded += s.received;
    }
    onProgress?.({ loaded, total });
  };

  // Abort sibling downloads when one fails or the caller cancels.
  const local = new AbortController();
  const onAbort = () => local.abort(signal.reason);
  signal?.addEventListener('abort', onAbort, { once: true });
  if (signal?.aborted) local.abort(signal.reason);

  const fetchOne = async (idx) => {
    const f = files[idx];
    const s = state[idx];
    if (cache && (await cache.match(f.url))) {
      s.received = s.expected;
      report();
      return;
    }
    const res = await fetchImpl(f.url, { signal: local.signal, mode: 'cors', credentials: 'omit' });
    if (!res.ok) {
      throw Object.assign(new Error(`HTTP ${res.status} — ${f.file ?? f.url}`), { name: 'HttpError', status: res.status });
    }
    const len = Number(res.headers.get('content-length'));
    if (len > 0) s.expected = len;

    let body = res.body;
    let cachePut = null;
    if (cache && body) {
      const [forProgress, forCache] = body.tee();
      body = forProgress;
      cachePut = cache.put(f.url, new Response(forCache, {
        status: res.status, statusText: res.statusText, headers: res.headers,
      }));
      cachePut.catch(() => {}); // surfaced below if the read succeeds
    }

    if (body) {
      const reader = body.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        s.received += value.byteLength;
        report();
      }
    } else {
      s.received = (await res.arrayBuffer()).byteLength;
    }
    if (cachePut) await cachePut;
    s.expected = s.received;
    report();
  };

  let next = 0;
  const lane = async () => {
    while (next < files.length) {
      if (local.signal.aborted) throw local.signal.reason ?? new DOMException('Aborted', 'AbortError');
      await fetchOne(next++);
    }
  };

  report();
  try {
    await Promise.all(Array.from({ length: Math.min(concurrency, files.length) }, () =>
      lane().catch((err) => { local.abort(err); throw err; })));
  } finally {
    signal?.removeEventListener('abort', onAbort);
  }
}
