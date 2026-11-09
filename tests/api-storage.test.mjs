import test from 'node:test';
import assert from 'node:assert/strict';
import { createApi, normalizeItem, trustedUrl } from '../src/api.js';
import { createStore } from '../src/storage.js';

// Synthetic fixtures test our contracts and error handling, not live service status.
const raw = { nb: '10', ar_title: 'فيلم', en_title: 'Movie', kind: '1', stars: '7.2', duration: '120', imgObjUrl: 'https://cnth2.shabakaty.cc/vascin-poster-images/one.webp' };
const item = normalizeItem(raw);
const jsonResponse = value => ({ ok: true, status: 200, json: async () => value });
function memoryStorage() {
  const values = new Map();
  return { values, getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value) };
}

test('URL trust rejects lookalike origins, credentials and non-HTTPS schemes', () => {
  assert.equal(trustedUrl('https://cdn.shabakaty.cc/a.mp4?signature=one'), 'https://cdn.shabakaty.cc/a.mp4?signature=one');
  for (const value of ['https://shabakaty.cc.evil.test/a', 'https://evilshabakaty.cc/a', 'http://cdn.shabakaty.cc/a', 'javascript:alert(1)', 'https://user:secret@cdn.shabakaty.cc/a', 'https://cdn.shabakaty.cc:8443/a']) assert.equal(trustedUrl(value), '');
});

test('metadata normalization excludes raw media fields and distinguishes covers', () => {
  const result = normalizeItem({ ...raw, videoUrl: 'https://cdn.shabakaty.cc/v.mp4?token=secret', imgObjUrl: 'https://cnth2.shabakaty.cc/vascin-cover-images/cover.jpg', categories: [{ ar_title: 'دراما' }] });
  assert.equal(result.backdrop, 'https://cnth2.shabakaty.cc/vascin-cover-images/cover.jpg');
  assert.equal(result.duration, 120);
  assert.deepEqual(result.genres, ['دراما']);
  assert.equal('videoUrl' in result, false);
  assert.equal(normalizeItem({ nb: '../account' }), null);
});

test('search encodes title and uses verified category_id without arbitrary filter injection', async () => {
  const calls = [];
  const client = createApi({ fetchImpl: async (url, options) => { calls.push({ url, options }); return jsonResponse([raw]); } });
  await client.search('a&category_id=61', 2, '84');
  const url = new URL(calls[0].url);
  assert.equal(url.searchParams.get('videoTitle'), 'a&category_id=61');
  assert.equal(url.searchParams.get('category_id'), '84');
  assert.equal(url.searchParams.get('page'), '2');
  assert.equal(calls[0].options.credentials, 'omit');
  assert.deepEqual(calls.map(call => new URL(call.url).searchParams.get('type')), ['movies', 'series']);
  assert.deepEqual(await client.search(''), []);
  await assert.rejects(client.search('x', -1));
  await assert.rejects(client.details('../settings'));
});

test('metadata has bounded lifetime while playback sources always refresh', async () => {
  let time = 0;
  const calls = [];
  const client = createApi({ now: () => time, fetchImpl: async (url, options) => {
    calls.push({ url, options });
    if (url.includes('transcoddedFiles')) return jsonResponse([{ videoUrl: 'https://cdn.shabakaty.cc/v.mp4?signature=' + calls.length, resolution: '1080p' }, { videoUrl: 'https://evil.test/v.mp4', resolution: '2160p' }]);
    if (url.includes('translationFiles')) return jsonResponse({ translations: [{ file: 'https://cnth2.shabakaty.cc/sub.vtt', name: 'arabic', extention: 'vtt' }] });
    return jsonResponse(raw);
  } });
  await client.details('10'); await client.details('10');
  assert.equal(calls.length, 1);
  time += 180001;
  await client.details('10');
  assert.equal(calls.length, 2);
  const first = await client.sources('10');
  const second = await client.sources('10');
  assert.equal(calls.length, 6);
  assert.equal(first.sources.length, 1);
  assert.equal(first.sources[0].type, 'video/mp4');
  assert.notEqual(first.sources[0].url, second.sources[0].url);
  assert.equal(first.subtitles[0].language, 'ar');
  assert.equal(calls[2].options.cache, 'no-store');
});

test('episodes are sorted numerically across interleaved seasons', async () => {
  const client = createApi({ fetchImpl: async () => jsonResponse([
    { ...raw, nb: '1', season: '2', episodeNummer: '1' },
    { ...raw, nb: '2', season: '1', episodeNummer: '10' },
    { ...raw, nb: '3', season: '1', episodeNummer: '2' },
  ]) });
  assert.deepEqual((await client.episodes('10')).map(ep => ep.id), ['3', '2', '1']);
});

test('group pagination accepts the UI prefix and validates group identifiers', async () => {
  const urls = [];
  const client = createApi({ fetchImpl: async url => { urls.push(url); return jsonResponse([raw]); } });
  const result = await client.group('group-26', 1);
  assert.equal(result[0].id, '10');
  assert.ok(urls[0].endsWith('/videoListPagination/groupID/26/level/0/itemsPerPage/24/page/1'));
  await assert.rejects(client.group('group-26/../../account'));
  await assert.rejects(client.group('group-group-26'));
  await assert.rejects(client.group('26', -1));
});

test('new catalog does not repeat an unpaginated endpoint on later pages', async () => {
  let requests = 0;
  const client = createApi({ fetchImpl: async () => { requests++; return jsonResponse([raw]); } });
  assert.equal((await client.catalog('new', 0))[0].id, '10');
  assert.deepEqual(await client.catalog('new', 1), []);
  assert.equal(requests, 1);
});

test('403 never retries; transient failures have one retry and URLs stay out of errors', async () => {
  let count = 0;
  const denied = createApi({ retryDelayMs: 0, fetchImpl: async () => { count++; return { ok: false, status: 403 }; } });
  await assert.rejects(denied.details('10'), /الوصول/);
  assert.equal(count, 1);
  count = 0;
  const broken = createApi({ retryDelayMs: 0, fetchImpl: async () => { count++; throw new Error('https://cdn.shabakaty.cc/?secret=token'); } });
  await assert.rejects(broken.details('10'), error => !error.message.includes('secret'));
  assert.equal(count, 2);
});

test('storage keeps progress and favorites metadata but excludes signed URLs and unknown fields', () => {
  const storage = memoryStorage();
  const state = createStore(storage, () => 1234);
  const privateItem = { ...item, poster: 'https://cnth2.shabakaty.cc/p.webp?token=secret', videoUrl: 'https://cdn.shabakaty.cc/v.mp4?token=secret', sources: [{ token: 'secret' }], session: 'secret' };
  assert.equal(state.toggleFavorite(privateItem), true);
  assert.equal(state.isFavorite('10'), true);
  assert.equal(state.saveProgress(privateItem, 51, 120), true);
  assert.equal(state.getProgress('10').position, 51);
  assert.equal(state.getProgress('10').updatedAt, 1234);
  const persisted = [...storage.values.values()].join('');
  assert.equal(/secret|videoUrl|sources|session/.test(persisted), false);
  assert.equal(state.favorites()[0].poster, '');
  const restarted = createStore(storage);
  assert.equal(restarted.getProgress('10').position, 51);
  assert.equal(restarted.toggleFavorite(item), false);
});

test('corrupt storage and quota failures preserve a working session-only store', () => {
  const storage = memoryStorage();
  storage.setItem('cinemana-tv.v1.favorites', '{broken');
  storage.setItem('cinemana-tv.v1.progress', '{"bad":true}');
  const state = createStore(storage);
  assert.deepEqual(state.favorites(), []);
  assert.deepEqual(state.progress(), []);
  const full = createStore({ getItem: () => null, setItem: () => { throw new Error('quota'); } });
  assert.equal(full.toggleFavorite(item), true);
  assert.equal(full.saveProgress(item, 33, 120), false);
  assert.equal(full.getProgress('10').position, 33);
  assert.equal(full.persistent(), false);
  assert.equal(full.isFavorite('10'), true);
});

test('settings whitelist and resume bounds survive invalid input', () => {
  const storage = memoryStorage();
  const state = createStore(storage);
  state.saveSettings({ subtitleSize: 125, subtitleLanguage: 'en', token: 'private', aspect: 'cover' });
  assert.equal(state.settings().subtitleSize, 125);
  assert.equal(state.settings().aspect, 'cover');
  assert.equal('token' in state.settings(), false);
  state.saveProgress(item, 500, 120);
  assert.equal(state.getProgress('10').position, 120);
  assert.equal(state.saveProgress(item, NaN, 120), false);
});

test('interface preferences persist with Arabic default and validated sizes',()=>{const storage=memoryStorage();const state=createStore(storage);assert.equal(state.settings().uiLanguage,'ar');state.saveSettings({uiLanguage:'en',fontSize:'large'});const restored=createStore(storage);assert.equal(restored.settings().uiLanguage,'en');assert.equal(restored.settings().fontSize,'large');restored.saveSettings({uiLanguage:'xx',fontSize:'huge',videoQuality:'unsafe'});assert.equal(restored.settings().uiLanguage,'ar');assert.equal(restored.settings().fontSize,'medium');assert.equal(restored.settings().videoQuality,'auto');});

test('sort-only search queries both catalogs and validates the sorting key',async()=>{const urls=[];const api=createApi({fetchImpl:async url=>{urls.push(url);return jsonResponse([raw])}});await api.search('',0,'','r_asc');assert.equal(urls.length,2);assert.equal(new URL(urls[0]).searchParams.get('sort'),'r_asc');await assert.rejects(api.search('',0,'','r_asc&token=bad'));});

test('server catalog sorting paginates globally and keeps movie/series scopes distinct',async()=>{
 const calls=[];const client=createApi({fetchImpl:async url=>{calls.push(url);return jsonResponse(url.includes('videosByCategory?')?{info:[raw]}:[raw])}});
 await client.browse('movies',1,'','stars_desc');assert.ok(calls[0].endsWith('/videoKind/1/sortParam/stars_desc/pageNumber/1'));
 await client.browse('series',2,'80','views_desc');const category=new URL(calls[1]);assert.equal(category.searchParams.get('videoKind'),'2');assert.equal(category.searchParams.get('offset'),'60');assert.equal(category.searchParams.get('orderby'),'views_desc');
 await client.search('Batman',0,'','','movies');assert.equal(calls.length,3);assert.equal(new URL(calls[2]).searchParams.get('type'),'movies');
 await assert.rejects(client.browse('movies',0,'','unknown'));await assert.rejects(client.browse('all'));
});

test('poster filenames supply trusted fallback when API omits full object URLs',()=>{
 assert.equal(normalizeItem({...raw,imgObjUrl:null,imgMediumThumbObjUrl:null,imgMediumThumb:'ABC-123_poster_medium_thumb.jpg'}).poster,'https://cnth2.shabakaty.cc/vascin-poster-images/ABC-123_poster_medium_thumb.jpg');
 for(const value of ['../secret.jpg','https://evil.test/a.jpg','a.jpg?token=x'])assert.equal(normalizeItem({...raw,imgObjUrl:null,imgMediumThumb:value}).poster,'');
});

test('partial source responses retain valid video and skip null entries', async () => {
  const client = createApi({fetchImpl: async url => jsonResponse(url.includes('transcoddedFiles')
    ? [null, {videoUrl:'https://cdn.shabakaty.cc/movie.mp4',resolution:'720p'}]
    : {translations:[null, {}]})});
  const result = await client.sources('10');
  assert.equal(result.sources.length, 1);
  assert.equal(result.sources[0].height, 720);
  assert.deepEqual(result.subtitles, []);
});

test('closing a playback request aborts both fetches without a retry', async () => {
  const caller = new AbortController();
  const signals = [];
  const client = createApi({fetchImpl: (_, {signal}) => new Promise((_, reject) => {
    signals.push(signal);
    signal.addEventListener('abort', () => reject(Object.assign(Error('Aborted'),{name:'AbortError'})));
  })});
  const request = client.sources('10', caller.signal);
  caller.abort();
  await assert.rejects(request, {name:'AbortError'});
  assert.equal(signals.length, 2);
  assert(signals.every(signal => signal.aborted));
});
