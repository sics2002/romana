import { normalizeSkips } from './parental.js';
// Read-only endpoints observed in Cinemana's public frontend and tested on 2026-10-10.
// No account credentials, server writes, or persisted playback URLs are used.
export const API_BASE = 'https://cinemana.shabakaty.cc/api/android/';
const META_TTL = 3 * 60 * 1000;
const MAX_CACHE = 40;
const PAGE_SIZE = 24;

export function trustedUrl(value) {
  if (typeof value !== 'string' || !value) return '';
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password ||
        (url.port && url.port !== '443') ||
        !(url.hostname === 'shabakaty.cc' || url.hostname.endsWith('.shabakaty.cc'))) return '';
    return url.href;
  } catch (_) { return ''; }
}

function number(value, fallback = 0) {
  const result = Number(value);
  return Number.isFinite(result) && result >= 0 ? result : fallback;
}
function text(value, maximum = 8000) {
  return typeof value === 'string' ? value.trim().slice(0, maximum) : '';
}
const ARABIC_CATEGORIES = { 'Reality-TV':'تلفزيون الواقع', News:'أخبار', 'Film-Noir':'أفلام الجريمة السوداء', 'Game-Show':'مسابقات', Magic:'سحر', 'Super Power':'قوى خارقة', Seinen:'أنمي للكبار', Shounen:'أنمي للشباب', School:'مدرسي', Sports:'رياضة', Program:'برامج', Religious:'ديني', 'Biopic series':'مسلسلات السيرة الذاتية', dialogue:'حواري', Entertaining:'ترفيهي', bollywood:'سينما هندية', 'War & Politics':'حروب وسياسة', Reality:'واقع', Soap:'دراما اجتماعية' };
function idOf(value) {
  const id = String(value == null ? '' : value);
  if (!/^\d{1,15}$/.test(id)) throw new Error('معرّف المحتوى غير صالح.');
  return id;
}
function pageOf(value) {
  const page = Number(value);
  if (!Number.isInteger(page) || page < 0 || page > 10000) throw new Error('رقم الصفحة غير صالح.');
  return page;
}

export function normalizeItem(raw, backdrop = '') {
  if (!raw || typeof raw !== 'object') return null;
  let id;
  try { id = idOf(raw.nb); } catch (_) { return null; }
  const posterFile=value=>typeof value==='string'&&/^[a-zA-Z0-9_-]+\.(?:jpe?g|png|webp)$/i.test(value)?'https://cnth2.shabakaty.cc/vascin-poster-images/'+value:'';
  const image = trustedUrl(raw.imgObjUrl);
  const cover = image && /\/vascin-cover-images\//.test(new URL(image).pathname) ? image : '';
  return {
    id,
    title: text(raw.ar_title, 300) || text(raw.en_title, 300) || 'بدون عنوان',
    originalTitle: text(raw.en_title, 300),
    poster: trustedUrl(raw.imgMediumThumbObjUrl) || image || trustedUrl(raw.imgThumbObjUrl) || posterFile(raw.imgMediumThumb) || posterFile(raw.imgThumb) || posterFile(raw.img),
    backdrop: trustedUrl(backdrop) || cover,
    releaseDate: text(raw.mDate,10)||text(String(raw.year||''),4),
    addedAt:text(raw.itemDate,30),
    parentalRating:raw.kind==='2'?number(raw.seriesRating):number(raw.filmRating),
    year: text(String(raw.year || ''), 4),
    rating: Math.min(10, number(raw.stars)),
    kind: String(raw.kind) === '2' ? 'series' : 'movie',
    description: text(raw.ar_content) || text(raw.en_content),
    descriptionEn:text(raw.en_content),
    duration: number(raw.duration),
    season: number(raw.season),
    episode: number(raw.episodeNummer),
    parentId: /^\d+$/.test(String(raw.rootSeries)) && Number(raw.rootSeries) > 0 ? String(raw.rootSeries) : id,
    genres: Array.isArray(raw.categories) ? raw.categories.map(c => text(c.ar_title, 100) || text(c.en_title, 100)).filter(Boolean) : [],
    language: raw.videoLanguages ? text(raw.videoLanguages.ar_title, 100) || text(raw.videoLanguages.en_title, 100) : '',
    audioTrackCount: number(raw.audioStreamNumber),
  };
}

function normalizeList(data, backdrops) {
  if (!Array.isArray(data)) throw new Error('استجابة المحتوى غير متوقعة.');
  const seen = new Set();
  return data.map(raw => normalizeItem(raw, backdrops.get(String(raw.nb))))
    .filter(item => item && !seen.has(item.id) && seen.add(item.id));
}

export function createApi({ fetchImpl = (...args) => globalThis.fetch(...args), now = () => Date.now(), timeoutMs = 12000, retryDelayMs = 400 } = {}) {
  const cache = new Map();
  const backdrops = new Map();
  const pending = new Map();

  async function read(path, fresh = false, signal) {
    const share = !fresh && !signal;
    const cancelled = () => Object.assign(new Error('Request cancelled'), {name:'AbortError'});
    const cached = cache.get(path);
    if (!fresh && cached && cached.expires > now()) return cached.value;
    if (share && pending.has(path)) return pending.get(path);
    const request = (async () => {
      for (let attempt = 0; attempt < 2; attempt++) {
        if (signal?.aborted) throw cancelled();
        const controller = new AbortController();
        const abort = () => controller.abort();
        signal?.addEventListener('abort', abort);
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        let retryable = true;
        try {
          const response = await fetchImpl(API_BASE + path, {
            method: 'GET', credentials: 'omit', signal: controller.signal,
            headers: { Accept: 'application/json' },
            ...(fresh ? { cache: 'no-store' } : {}),
          });
          if (!response.ok) {
            retryable = response.status >= 500;
            throw new Error(response.status === 401 || response.status === 403
              ? 'الوصول إلى المحتوى غير متاح من هذه الشبكة.' : 'تعذر تحميل المحتوى (' + response.status + ').');
          }
          const value = await response.json();
          if (!fresh) {
            cache.delete(path);
            cache.set(path, { value, expires: now() + META_TTL });
            while (cache.size > MAX_CACHE) cache.delete(cache.keys().next().value);
          }
          return value;
        } catch (error) {
          if (signal?.aborted) throw cancelled();
          if (attempt === 1 || !retryable) {
            if (error && error.name === 'AbortError') throw new Error('انتهت مهلة الاتصال. حاول مرة أخرى.');
            if (error instanceof SyntaxError) throw new Error('وصلت استجابة غير صالحة من الخدمة.');
            // Never echo fetch URLs: media endpoints may return signed links.
            if (error && /^الوصول|^تعذر تحميل/.test(error.message)) throw error;
            throw new Error('تعذر الاتصال بسينمانا. تحقق من الشبكة وحاول مرة أخرى.');
          }
        } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
        await new Promise(resolve => setTimeout(resolve, retryDelayMs));
      }
    })();
    if (share) pending.set(path, request);
    try { return await request; } finally { if (share) pending.delete(path); }
  }

  const client = {
    async home(language='ar') {
      if(!['ar','en'].includes(language))throw new Error('Invalid interface language');
      const responses = await Promise.allSettled([
        read('banner/level/0'), read('videoGroups/lang/'+language+'/level/0'),
        client.catalog('movies'), client.catalog('series'), client.catalog('new'),
      ]);
      let banners = [];
      if (responses[0].status === 'fulfilled' && Array.isArray(responses[0].value)) {
        banners = normalizeList(responses[0].value, backdrops).slice(0, 12);
        banners.forEach(item => { if (item.backdrop) backdrops.set(item.id, item.backdrop); });
        while (backdrops.size > 60) backdrops.delete(backdrops.keys().next().value);
      }
      const rows = [];
      if (responses[4].status === 'fulfilled' && responses[4].value.length)
        rows.push({ id: 'new', title: 'الإصدارات الجديدة', items: responses[4].value, hasMore: false });
      [['movies', 'أحدث الأفلام', 2], ['series', 'أحدث المسلسلات', 3]].forEach(([id, title, index]) => {
        const response = responses[index];
        if (response.status === 'fulfilled' && response.value.length)
          rows.push({ id, title, items: response.value, hasMore: response.value.length === PAGE_SIZE });
      });
      const groupResponse = responses[1];
      if (groupResponse.status === 'fulfilled' && groupResponse.value && Array.isArray(groupResponse.value.groups)) {
        groupResponse.value.groups.forEach(group => {
          if (!Array.isArray(group?.content)) return;
          const items = normalizeList(group.content, backdrops);
          if (items.length) rows.push({ id: 'group-' + String(group.groupsID), title: text(group.title, 150), items, hasMore: Number(group.hasPagination) === 1 });
        });
      }
      if (!rows.length && !banners.length) {
        const failure = responses.find(response => response.status === 'rejected');
        throw failure ? failure.reason : new Error('لم تتوفر بيانات للعرض.');
      }
      return { banners, rows };
    },
    async catalog(kind, page = 0) {
      page = pageOf(page);
      let path;
      if (kind === 'movies' || kind === 'series') path = (kind === 'movies' ? 'latestMovies' : 'latestSeries') + '/level/0/itemsPerPage/' + PAGE_SIZE + '/page/' + page;
      else if (kind === 'new') {
        // This endpoint ignores page/offset changes. Do not invent pagination.
        if (page > 0) return [];
        path = 'newlyVideosItems/level/0/offset/12/';
      } else throw new Error('نوع قائمة المحتوى غير صالح.');
      return normalizeList(await read(path), backdrops);
    },
    async group(id, page = 0) {
      const groupId = idOf(String(id).replace(/^group-/, ''));
      return normalizeList(await read('videoListPagination/groupID/' + groupId + '/level/0/itemsPerPage/' + PAGE_SIZE + '/page/' + pageOf(page)), backdrops);
    },
    async search(query, page = 0, category = '', sort = '', kind = '') {
      const value = text(query, 200);
      const params = new URLSearchParams({ level: '0', page: String(pageOf(page)) });
      if (value) params.set('videoTitle', value);
      if (category !== '' && category != null) params.set('category_id', idOf(category));
      if(sort){if(!['asc','desc','r_asc','r_desc','title_asc','title_desc','rating_asc','rating_desc','stars_asc','stars_desc'].includes(sort))throw Error('ترتيب غير صالح');params.set('sort',sort)}
      if (!value && !params.has('category_id') && !sort) return [];
      // The service defaults to films when type is omitted; search both catalogs.
      if(kind&&!['movies','series'].includes(kind))throw new Error('نوع قائمة المحتوى غير صالح.');
      const results = await Promise.all((kind?[kind]:['movies', 'series']).map(type => {
        const typed = new URLSearchParams(params);
        typed.set('type', type);
        return read('AdvancedSearch?' + typed.toString());
      }));
      const items = normalizeList(results.flat(), backdrops);
      const queryLower = value.toLocaleLowerCase();
      const relevance = item => queryLower && (item.title.toLocaleLowerCase().includes(queryLower) || item.originalTitle.toLocaleLowerCase().includes(queryLower)) ? 1 : 0;
      return items.sort((a, b) => relevance(b) - relevance(a));
    },
    async browse(kind, page = 0, category = '', sort = 'desc') {
      if(!['movies','series'].includes(kind))throw new Error('نوع قائمة المحتوى غير صالح.');
      if(!['asc','desc','r_asc','r_desc','title_asc','title_desc','views_asc','views_desc','rating_asc','rating_desc','stars_asc','stars_desc'].includes(sort))throw new Error('ترتيب غير صالح');
      const videoKind=kind==='series'?'2':'1';page=pageOf(page);
      if(category){const data=await read('videosByCategory?'+new URLSearchParams({categoryID:idOf(category),orderby:sort,videoKind,offset:String(page*30),level:'0'}));return normalizeList(data?.info,backdrops);}
      return normalizeList(await read('video/V/2/itemsPerPage/30/level/0/videoKind/'+videoKind+'/sortParam/'+sort+'/pageNumber/'+page),backdrops);
    },
    async categories() {
      const results = await Promise.all([read('mainCategories?lang=ar'), read('subCategories?lang=ar')]);
      const seen = new Set();
      return results.flat().map(raw => {
        try { const title = text(raw.title, 100); return { id: idOf(raw.nb), title: ARABIC_CATEGORIES[title] || title }; } catch (_) { return null; }
      }).filter(item => item && item.title && !seen.has(item.id) && seen.add(item.id));
    },
    async details(id) {
      id = idOf(id);
      const item = normalizeItem(await read('allVideoInfo/id/' + id), backdrops.get(id));
      if (!item) throw new Error('لم تعد تفاصيل هذا المحتوى متاحة.');
      return item;
    },
    async episodes(id, signal) {
      const items = normalizeList(await read('videoSeason/id/' + idOf(id), false, signal), backdrops);
      return items.sort((a, b) => a.season - b.season || a.episode - b.episode);
    },
    async related(id, kind = 'movie', signal) {
      return normalizeList(await read('relatedVideos/id/' + idOf(id) + '/kind/' + (kind === 'series' ? '2' : '1') + '/level/0', false, signal), backdrops);
    },
    async skips(id, signal) { return normalizeSkips(await read('skippingDurations/id/' + idOf(id), true, signal)); },
    async sources(id, signal) {
      id = idOf(id);
      const [videos, translations] = await Promise.all([
        read('transcoddedFiles/id/' + id, true, signal),
        read('translationFiles/id/' + id, true, signal).catch(() => ({ translations: [] })),
      ]);
      if (!Array.isArray(videos)) throw new Error('لم تتوفر مصادر تشغيل لهذا المحتوى.');
      const sources = videos.map(raw => {
        const url = trustedUrl(raw?.videoUrl);
        if (!url) return null;
        const extension = new URL(url).pathname.split('.').pop().toLowerCase();
        const type = { mp4: 'video/mp4', m3u8: 'application/vnd.apple.mpegurl', mpd: 'application/dash+xml', webm: 'video/webm' }[extension];
        if (!type) return null;
        const label = text(raw.resolution, 40) || 'الجودة المتاحة';
        const matchedHeight = label.match(/(\d{3,4})/);
        return { url, label, type, height: matchedHeight ? Number(matchedHeight[1]) : /4k/i.test(label) ? 2160 : 0 };
      }).filter(Boolean).sort((a, b) => b.height - a.height);
      const subtitles = (translations && Array.isArray(translations.translations) ? translations.translations : []).map(raw => {
        const url = trustedUrl(raw?.file);
        if (!url) return null;
        const format = (text(raw.extention, 10) || new URL(url).pathname.split('.').pop()).toLowerCase();
        if (!['vtt', 'srt', 'ass'].includes(format)) return null;
        const name = text(raw.name, 80);
        const language = /arabic|^ar$|عرب/i.test(name) ? 'ar' : /english|^en$|انج|إنج/i.test(name) ? 'en' : name.toLowerCase();
        return { url, language, label: language === 'ar' ? 'العربية' : language === 'en' ? 'الإنجليزية' : name || 'ترجمة', format };
      }).filter(Boolean);
      return { sources, subtitles };
    },
    clearCache() { cache.clear(); backdrops.clear(); },
  };
  return client;
}

export const api = createApi();
