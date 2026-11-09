import test from 'node:test';
import assert from 'node:assert/strict';
import { TVPlayer, playableSources, clampPosition, formatTime } from '../src/player.js';

const sample = { url: 'https://media.example/movie.mp4', label: '1080p', type: 'video/mp4', height: 1080 };

function element() {
  return { hidden: true, textContent: '', dataset: {}, style: { setProperty() {} }, setAttribute() {}, querySelector: () => element() };
}

class FakeVideo extends EventTarget {
  constructor() { super(); this.paused = true; this.currentTime = 0; this.duration = 300; this.readyState = 1; this.textTracks = []; this.tracks = []; this.style = {}; this.ended = false; }
  canPlayType(type) { return type === 'video/mp4' ? 'probably' : ''; }
  pause() { this.paused = true; }
  async play() { this.paused = false; }
  load() {}
  removeAttribute() {}
  querySelectorAll() { return this.tracks; }
  appendChild(track) { this.tracks.push(track); }
}

function harness() {
  const player = Object.create(TVPlayer.prototype);
  const nodes = new Map();
  const root = { ...element(), hidden: false, querySelector(selector) { if (!nodes.has(selector)) nodes.set(selector, element()); return nodes.get(selector); } };
  Object.assign(player, {
    libraryLoaded: true, root, video: new FakeVideo(), item: { id: '1', title: 'One' }, sources: [sample, { ...sample, label: '720p' }], subtitles: [],
    sourceIndex: 0, subtitleIndex: -1, session: 1, loadSequence: 0, subtitleSequence: 0, settings: { subtitleLanguage: 'off' }, loading: false,
    status: element(), controls: element(), header: element(), shade: element(), errorBox: element(), panel: element(), playButton: element(),
    store: { settings: () => ({}), getProgress: () => null, saveProgress() {}, saveSettings() {} },
    _focus() {}, _scheduleHide() {}, _applySettings() {}, _notice() {}
  });
  return player;
}

test('source filtering accepts native MP4 without rewriting signed paths and checks HLS support', () => {
  const signed = { ...sample, url: 'https://media.example/movie.mp4?expires=123&signature=abc' };
  const hls = { url: 'https://media.example/live.m3u8', type: 'application/vnd.apple.mpegurl' };
  const dash = { url: 'https://media.example/live.mpd', type: 'application/dash+xml' };
  assert.deepEqual(playableSources([signed, hls, dash, { url: 'javascript:bad()', type: 'video/mp4' }], new FakeVideo()), [signed]);
  assert.deepEqual(playableSources([hls], { canPlayType: () => 'maybe' }), [hls]);
});

test('seek clamping rejects invalid inputs and avoids seeking past the media end', () => {
  assert.equal(clampPosition(-10, 100), 0);
  assert.equal(clampPosition(Infinity, 100), 0);
  assert.equal(clampPosition(105, 100), 99.75);
  assert.equal(clampPosition(75, 100), 75);
  assert.equal(formatTime(3671), '1:01:11');
});

test('quality load preserves position and pause state', async () => {
  const player = harness();
  const loading = player._loadSource(1, 83, true);
  assert.equal(player.loading, true);
  assert.equal(player.video.paused, true);
  player.video.dispatchEvent(new Event('loadedmetadata'));
  await loading;
  assert.equal(player.video.currentTime, 83);
  assert.equal(player.video.paused, true);
  assert.equal(player.root.dataset.playerState, 'paused');
  assert.equal(player.root.dataset.quality, '720p');
});

test('quality load resumes an actively playing item after metadata', async () => {
  const player = harness();
  const loading = player._loadSource(1, 122, false);
  player.video.dispatchEvent(new Event('loadedmetadata'));
  await loading;
  assert.equal(player.video.currentTime, 122);
  assert.equal(player.video.paused, false);
});

test('superseded media loading is cancelled and cannot overwrite the next source', async () => {
  const player = harness();
  const first = player._loadSource(0, 11, false);
  const rejected = assert.rejects(first, { name: 'AbortError' });
  const second = player._loadSource(1, 92, true);
  player.video.dispatchEvent(new Event('loadedmetadata'));
  await Promise.all([rejected, second]);
  assert.equal(player.video.currentTime, 92);
  assert.equal(player.video.paused, true);
  assert.equal(player.sourceIndex, 1);
});

test('a response from a closed item never opens media', async () => {
  const player = harness();
  let resolveSources, signal;
  player.api = { sources: (_, currentSignal) => new Promise(resolve => { resolveSources = resolve; signal = currentSignal; }) };
  let loaded = false;
  player._loadSource = async () => { loaded = true; };
  const open = player.open({ id: '9', title: 'Nine' });
  player.close();
  assert.equal(signal.aborted, true);
  resolveSources({ sources: [sample], subtitles: [] });
  await open;
  assert.equal(loaded, false);
  assert.equal(player.root.dataset.playerState, 'closed');
  assert.equal(player.root.hidden, true);
});

test('progress is saved only for a ready, current item and never during source replacement', () => {
  const player = harness();
  const saved = [];
  player.store.saveProgress = (...args) => saved.push(args);
  player.video.currentTime = 45;
  player._saveProgress();
  assert.deepEqual(saved[0], [player.item, 45, 300]);
  player.loading = true;
  player.video.currentTime = 0;
  player._saveProgress();
  player.loading = false;
  player.video.readyState = 0;
  player._saveProgress();
  assert.equal(saved.length, 1);
});

test('late play rejection from an old item does not show an error on a new item', async () => {
  const player = harness();
  let rejectPlay;
  player.video.play = () => new Promise((_, reject) => { rejectPlay = reject; });
  let errorShown = false;
  player._showError = () => { errorShown = true; };
  const playing = player.togglePlay();
  player.session++;
  player.item = { id: '2', title: 'Two' };
  rejectPlay(new Error('Old media aborted'));
  await playing;
  assert.equal(errorShown, false);
});

test('Up and Down reveal transport focused on Play without seeking', () => {
 const p=harness();p.video.currentTime=100;let focused;p._focus=id=>focused=id;
 for(const key of ['ArrowUp','ArrowDown']){p.controlsVisible=false;p.handleKey({key,preventDefault(){}});assert.equal(p.controlsVisible,true);assert.equal(focused,'player-play');assert.equal(p.video.currentTime,100);}
});
test('timeline is the only arrow seek target; Up exits and Back dismisses panels', () => {
 const p=harness();const old=globalThis.document;globalThis.document={activeElement:{dataset:{focus:'player-timeline'},blur(){}}};p.root.contains=()=>false;
 try{p.controlsVisible=true;p.video.currentTime=100;p.handleKey({key:'ArrowRight',preventDefault(){}});assert.equal(p.video.currentTime,130);
 p.handleKey({key:'ArrowUp',preventDefault(){}});assert.equal(p.controlsVisible,false);
 p.controlsVisible=true;p.panelName='caption-settings';p.panel.hidden=false;p.handleKey({key:'Back',preventDefault(){}});assert.equal(p.panel.hidden,true);assert.equal(p.panelName,null);assert.equal(p.controlsVisible,false);
 }finally{globalThis.document=old;clearTimeout(p.seekFeedbackTimer)}
});
test('held arrows throttle and accelerate at one and three seconds with symmetric rewind', t => {
 const player=harness();player.controlsVisible=false;player.video.duration=5000;player.video.currentTime=1000;
 let now=0;t.mock.method(Date,'now',()=>now);
 const press=(key,repeat=false)=>player._remoteSeek(key,repeat);
 press('ArrowRight');assert.equal(player.video.currentTime,1030);
 now=100;press('ArrowRight',true);assert.equal(player.video.currentTime,1030);
 now=1100;press('ArrowRight',true);assert.equal(player.video.currentTime,1090);
 now=3100;press('ArrowRight',true);assert.equal(player.video.currentTime,1210);
 press('ArrowLeft');assert.equal(player.video.currentTime,1180);
 now=6200;press('ArrowLeft',true);assert.equal(player.video.currentTime,1060);
 player.handleKeyUp({key:'ArrowLeft'});now=6500;press('ArrowLeft');assert.equal(player.video.currentTime,1030);
 clearTimeout(player.seekFeedbackTimer);
});

test('subtitle overlay displays parsed cue text and clears inactive cues', () => {
  const player = harness(); const span = { textContent: '' };
  player.captions = { hidden: true, querySelector: () => span };
  player.video.textTracks = [{ mode: 'hidden', activeCues: [{ getCueAsHTML: () => ({ textContent: 'مرحبا <نص>' }) }] }];
  player._renderCaptions(); assert.equal(span.textContent, 'مرحبا <نص>'); assert.equal(player.captions.hidden, false);
  player.video.textTracks[0].activeCues = []; player._renderCaptions();
  assert.equal(span.textContent, ''); assert.equal(player.captions.hidden, true);
});

test('subtitle selection uses credential-free CORS fetch and ignores an obsolete response', async t => {
  const player = harness();
  let resolveFetch;
  let captured;
  t.mock.method(globalThis, 'fetch', (url, options) => { captured = options; return new Promise(resolve => { resolveFetch = resolve; }); });
  player.subtitles = [{ url: 'https://media.example/ar.vtt', language: 'ar', format: 'vtt', label: 'العربية' }];
  const selection = player._setSubtitle(0);
  assert.equal(captured.mode, 'cors');
  assert.equal(captured.credentials, 'omit');
  player.session++;
  resolveFetch({ ok: true, text: async () => 'WEBVTT\n\n00:00.000 --> 00:03.000\nHello\n' });
  await selection;
  assert.equal(player.video.tracks.length, 0);
  assert.equal(player.subtitleUrl, null);
});

test('SRT and ASS are disclosed as unsupported rather than silently selected', () => {
  const player = harness();
  assert.equal(player._supportedSubtitle({ url: 'https://media.example/ar.srt', format: 'srt' }), false);
  assert.equal(player._supportedSubtitle({ url: 'https://media.example/ar.vtt', format: 'vtt' }), true);
});

test('auto-next crosses seasons, starts at zero, and does not loop after the finale', async()=>{
 const p=harness();p.item={id:'2',kind:'series',parentId:'1'};p.episodeQueue=Promise.resolve([{id:'1',season:1,episode:1},{id:'2',season:1,episode:2},{id:'3',season:2,episode:1}]);
 p.api={details:async id=>({id,kind:'series'})};let opened;p.open=async(item,options)=>{opened={item,options}};
 await p._onEnded();assert.equal(opened.item.id,'3');assert.equal(opened.item.parentId,'1');assert.equal(opened.options.fromStart,true);
 p.advancing=false;p.item={id:'3',kind:'series',parentId:'1'};opened=null;await p._onEnded();assert.equal(opened,null);assert.equal(p.controlsVisible,true);
});
test('closing while next episode metadata is pending never reopens playback',async()=>{
 const p=harness();p.item={id:'1',kind:'series'};p.episodeQueue=Promise.resolve([{id:'1'},{id:'2'}]);let resolve;let called=0;
 p.api={details:()=>new Promise(r=>{resolve=r})};p.open=async()=>called++;
 const pending=p._onEnded();await Promise.resolve();p.session++;p.item=null;resolve({id:'2'});await pending;assert.equal(called,0);
});
test('duplicate ended events only request the next episode once',async()=>{
 const p=harness();p.item={id:'1',kind:'series'};p.episodeQueue=Promise.resolve([{id:'1'},{id:'2'}]);let called=0;p.api={details:async()=>{called++;return{id:'2'}}};p.open=async()=>{};
 await Promise.all([p._onEnded(),p._onEnded()]);assert.equal(called,1);
});

test('clean-video Left and Right seek immediately without opening menus',()=>{
 const p=harness();p.controlsVisible=false;p.video.currentTime=100;
 p.handleKey({key:'ArrowRight',preventDefault(){}});assert.equal(p.video.currentTime,130);assert.equal(p.controlsVisible,false);
 p.handleKeyUp({key:'ArrowRight'});p.handleKey({key:'ArrowLeft',preventDefault(){}});assert.equal(p.video.currentTime,100);assert.equal(p.controlsVisible,false);clearTimeout(p.seekFeedbackTimer);
});

test('clean OK toggles playback immediately instead of consuming the first press to show controls',async()=>{
 const p=harness();p.controlsVisible=false;p.video.paused=false;p.handleKey({keyCode:13,preventDefault(){}});await Promise.resolve();assert.equal(p.video.paused,true);
 p.controlsVisible=false;p.handleKey({keyCode:13,preventDefault(){}});await Promise.resolve();assert.equal(p.video.paused,false);
});
test('library stages hide all other shelves and reset scroll',()=>{
 const p=harness();const sections=[{dataset:{shelf:'episodes'}},{dataset:{shelf:'recommendations'}}];p.root.querySelectorAll=()=>sections;p.controls.scrollTop=200;
 p._setLibraryStage('episodes',false);assert.equal(sections[0].hidden,false);assert.equal(sections[1].hidden,true);assert.equal(p.controls.scrollTop,0);
 p._setLibraryStage('recommendations',false);assert.equal(sections[0].hidden,true);assert.equal(sections[1].hidden,false);
 p._setLibraryStage('transport',false);assert.ok(sections.every(x=>x.hidden));assert.equal(p.root.querySelector('.player-library').hidden,true);
});
test('RTL shelf arrows page beyond three cards without escaping the episode row',()=>{
 const p=harness();const old=globalThis.document;globalThis.document={documentElement:{dir:'rtl'},activeElement:{dataset:{relatedType:'episodes',value:'3'}}};
 p.controlsVisible=true;p.shelves={episodes:{items:Array.from({length:8},(_,i)=>({id:String(i+1)})),index:2}};
 let rendered,focused;p._renderShelf=type=>rendered=type;p._focus=id=>focused=id;
 try{p.handleKey({keyCode:37,preventDefault(){}});assert.equal(p.shelves.episodes.index,3);assert.equal(rendered,'episodes');assert.equal(focused,'related-episodes-4');
 globalThis.document.activeElement.dataset.value='1';p.handleKey({keyCode:39,preventDefault(){}});assert.equal(p.shelves.episodes.index,0);
 }finally{globalThis.document=old}
});

test('quick pause cancels a pending play without turning AbortError into a fatal error',async()=>{
 const p=harness();let reject;let fatal=false;p._showError=()=>fatal=true;
 p.video.play=()=>{p.video.paused=false;return new Promise((_,r)=>reject=r)};
 const first=p.togglePlay();await p.togglePlay();reject(Object.assign(Error('interrupted by pause'),{name:'AbortError'}));await first;assert.equal(p.video.paused,true);assert.equal(fatal,false);
});
test('Back leaves a video error instead of trapping focus on retry',()=>{
 const p=harness();p.errorBox.hidden=false;p.controlsVisible=true;let closed=false;p.close=()=>closed=true;
 p.handleKey({keyCode:461,preventDefault(){}});assert.equal(closed,true);
});

test('idle hide cancels pending shelf focus before late recommendations arrive',()=>{
 const p=harness();p.pendingShelfFocus=true;p._setLibraryStage('transport',false);assert.equal(p.pendingShelfFocus,false);
});
