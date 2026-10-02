// Warms the service-worker cache with every lazily-loaded app chunk, so all
// features keep working offline. The list is emitted at build time
// (see the `offline-assets` plugin in vite.config.js).
export async function cacheAppForOffline({ fetchImpl = fetch } = {}) {
  const base = import.meta.env.BASE_URL;
  let assets = [];
  try {
    const res = await fetchImpl(`${base}offline-assets.json`, { cache: 'no-cache' });
    if (res.ok) assets = await res.json();
  } catch {
    return; // dev server or offline: nothing to warm
  }
  await Promise.all(assets.map((path) => fetchImpl(base + path).catch(() => {})));
}
