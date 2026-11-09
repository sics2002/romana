function timeoutSignal(ms){if(typeof AbortSignal!=='undefined'&&AbortSignal.timeout)return AbortSignal.timeout(ms);const controller=new AbortController();setTimeout(()=>controller.abort(),ms);return controller.signal}
const CHANNELS = { film: 'The Guardian', television: 'The Guardian', deadline: 'Deadline', hollywood: 'The Hollywood Reporter', netflix: 'Netflix', warner: 'Warner Bros.' };
const TRUSTED = ['theguardian.com','guim.co.uk','deadline.com','hollywoodreporter.com','youtube.com','ytimg.com','tvmaze.com'];
export function publicUrl(value) {
  try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password && (!u.port || u.port === '443') && TRUSTED.some(host => u.hostname === host || u.hostname.endsWith('.'+host)) ? u.href : ''; } catch (_) { return ''; }
}
function plain(value) {
  const parsed = new DOMParser().parseFromString(String(value || ''), 'text/html');
  return (parsed.body.textContent || '').trim();
}
export function parseFeed(xml, id) {
  const document = new DOMParser().parseFromString(xml, 'text/xml');
  if (document.querySelector('parsererror')) throw Error('Invalid feed');
  return [...document.getElementsByTagName(id === 'netflix' || id === 'warner' ? 'entry' : 'item')].slice(0,30).map((entry, index) => {
    const get = name => entry.getElementsByTagName(name)[0]?.textContent || '';
    const title = plain(get('title')).slice(0,350);
    const youtubeId = get('yt:videoId');
    const url = publicUrl(youtubeId ? 'https://www.youtube.com/watch?v=' + youtubeId : get('link'));
    const media = [...entry.getElementsByTagName('media:content'), ...entry.getElementsByTagName('media:thumbnail')].sort((a,b)=>Number(b.getAttribute('width')||0)-Number(a.getAttribute('width')||0));
    const image = media.map(el => publicUrl(el.getAttribute('url'))).find(value => value && !value.includes('youtube.com/v/')) || '';
    const trailer = /^[\w-]{11}$/.test(youtubeId) && /trailer|teaser|إعلان/i.test(title);
    return { id: id+'-'+(youtubeId||index), title, image, url, date: get('pubDate') || get('published'), description: plain(get('description')).slice(0,350), source: CHANNELS[id], kind: youtubeId ? 'trailer' : id === 'television' ? 'series-news' : 'film-news', youtubeId: trailer ? youtubeId : '' };
  }).filter(item => item.title && item.url && (!(id === 'netflix' || id === 'warner') || item.youtubeId));
}
export function requestFeed(id) {
  if (window.PalmServiceBridge) return new Promise((resolve, reject) => {
    const bridge = new window.PalmServiceBridge();
    const timer = setTimeout(() => { bridge.cancel?.(); reject(Error('Timeout')); }, 10000);
    bridge.onservicecallback = raw => { clearTimeout(timer); try { const result = JSON.parse(raw); result.returnValue && typeof result.xml === 'string' ? resolve(result.xml) : reject(Error('Feed unavailable')); } catch (_) { reject(Error('Invalid reply')); } };
    bridge.call('luna://com.cinemanatv.app.news/feed', JSON.stringify({ id }));
  });
  return fetch('/news-api/feed?id='+encodeURIComponent(id), { signal: timeoutSignal(10000), credentials:'omit' }).then(response => { if (!response.ok) throw Error('Unavailable'); return response.text(); });
}
export async function getFeed(id) { return parseFeed(await requestFeed(id), id); }
export async function getSeries() {
  const response = await fetch('https://api.tvmaze.com/schedule?country=US', { signal:timeoutSignal(10000),credentials:'omit' });
  if (!response.ok) throw Error('Schedule unavailable');
  const raw = await response.json(); const seen = new Set();
  return (Array.isArray(raw)?raw:[]).map(entry => entry?.show).filter(show => show && typeof show.name==='string' && show.image && !seen.has(show.id) && seen.add(show.id)).slice(0,24).map(show => ({ id:'tvmaze-'+show.id, title:show.name, image:publicUrl(show.image.medium), url:publicUrl(show.url), description:plain(show.summary).slice(0,1200), source:'TVmaze · CC BY-SA', kind:'series', date:show.premiered || '' }));
}
const CACHE = 'cinemana-tv.news.v1';
export function loadNewsCache() {
  try {
    const value = JSON.parse(localStorage.getItem(CACHE) || 'null');
    if (!value || Date.now()-value.time > 7*86400000 || !Array.isArray(value.rows)) return [];
    return value.rows.filter(row=>row&&typeof row.id==='string'&&typeof row.title==='string'&&Array.isArray(row.items)).slice(0,7).map(row => ({ ...row, updatedAt:Number.isFinite(row.updatedAt)&&Math.abs(row.updatedAt)<=8640000000000000?row.updatedAt:0, items:row.items.slice(0,30).filter(item => typeof item?.id==='string' && typeof item.title==='string' && publicUrl(item.url)).map(item => ({...item,image:publicUrl(item.image)})) })).filter(row=>row.items.length);
  } catch (_) { return []; }
}
export function saveNewsCache(rows) { try { localStorage.setItem(CACHE, JSON.stringify({time:Date.now(),rows})); } catch (_) {} }
