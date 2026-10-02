import { describe, expect, it } from 'vitest';
import { downloadFiles } from '../src/lib/engine/download.js';

// Response whose body streams `size` bytes in `chunks` pieces.
function fakeResponse(size, { chunks = 4, contentLength = size } = {}) {
  const piece = Math.ceil(size / chunks);
  let sent = 0;
  const body = new ReadableStream({
    pull(controller) {
      if (sent >= size) return controller.close();
      const n = Math.min(piece, size - sent);
      sent += n;
      controller.enqueue(new Uint8Array(n));
    },
  });
  const headers = contentLength == null ? {} : { 'content-length': String(contentLength) };
  return new Response(body, { status: 200, headers });
}

describe('downloadFiles (no Cache Storage in Node)', () => {
  it('reports monotonic progress ending at 100%, refined by Content-Length', async () => {
    const sizes = { a: 1000, b: 3000 };
    const fetchImpl = async (url) => fakeResponse(sizes[url]);
    const events = [];
    await downloadFiles(
      [{ url: 'a', bytes: 500 }, { url: 'b', bytes: 500 }],
      { fetchImpl, onProgress: (p) => events.push(p) },
    );
    const last = events.at(-1);
    expect(last.loaded).toBe(4000);
    expect(last.total).toBe(4000);
    for (let i = 1; i < events.length; i++) expect(events[i].loaded).toBeGreaterThanOrEqual(events[i - 1].loaded);
    for (const e of events) expect(e.loaded).toBeLessThanOrEqual(e.total);
  });

  it('copes with a missing or too-small Content-Length (compressed responses)', async () => {
    const fetchImpl = async () => fakeResponse(2000, { contentLength: 800 });
    const events = [];
    await downloadFiles([{ url: 'x', bytes: 100 }], { fetchImpl, onProgress: (p) => events.push(p) });
    for (const e of events) expect(e.loaded).toBeLessThanOrEqual(e.total);
    expect(events.at(-1)).toEqual({ loaded: 2000, total: 2000 });
  });

  it('rejects on HTTP errors', async () => {
    const fetchImpl = async () => new Response('nope', { status: 404 });
    await expect(downloadFiles([{ url: 'x', file: 'x.whl', bytes: 1 }], { fetchImpl })).rejects.toThrow(/404/);
  });

  it('aborts when the caller cancels', async () => {
    const controller = new AbortController();
    const fetchImpl = (_url, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    });
    const p = downloadFiles([{ url: 'x', bytes: 1 }], { fetchImpl, signal: controller.signal });
    controller.abort();
    await expect(p).rejects.toMatchObject({ name: 'AbortError' });
  });
});
