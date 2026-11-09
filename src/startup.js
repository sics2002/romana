import { API_BASE, normalizeItem } from './api.js';

// Availability, not IP geolocation: no location service or user identifiers.
export async function chooseMode({ fetchImpl = fetch, timeoutMs = 1200 } = {}) {
  const controller = new AbortController();
  let timer;
  const unavailable = new Promise(resolve => { timer = setTimeout(() => { controller.abort(); resolve({ mode: 'news', reason: 'timeout' }); }, timeoutMs); });
  const probe = (async () => {
    try {
      const response = await fetchImpl(API_BASE + 'newlyVideosItems/level/0/offset/12/', {
        credentials: 'omit', cache: 'no-store', signal: controller.signal, headers: { Accept: 'application/json' },
      });
      if (!response.ok) return { mode: 'news', reason: 'http' };
      const raw = await response.json();
      if (!Array.isArray(raw)) return { mode: 'news', reason: 'invalid' };
      const items = raw.map(item => normalizeItem(item)).filter(item => item && item.poster);
      return items.length ? { mode: 'cinemana', items } : { mode: 'news', reason: 'empty' };
    } catch (_) { return { mode: 'news', reason: 'network' }; }
  })();
  try { return await Promise.race([probe, unavailable]); }
  finally { clearTimeout(timer); }
}
