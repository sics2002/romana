import {createVault} from './vault.js';
// Persist only an explicit metadata allowlist. Playback/subtitle URLs and sessions
// never enter localStorage; signed image URLs are excluded as well.
import { trustedUrl } from './api.js';

const PREFIX = 'cinemana-tv.v1.';
const FAVORITES_LIMIT = 200;
const PROGRESS_LIMIT = 100;
const DEFAULT_SETTINGS = Object.freeze({
  oledShield:false, parentalMode: 'default', subtitleFont: 'Arial', subtitleEdge: 'shadow', subtitleLanguage: 'ar', subtitleSize: 100, subtitleBackground: true,
  subtitlePosition: 'bottom', aspect: 'contain', theme: 'dark', uiLanguage:'ar', fontSize:'medium', videoQuality:'auto',
});
const cleanText = (value, maximum) => typeof value === 'string' ? value.slice(0, maximum) : '';
const finite = value => Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : 0;

function safeImage(value) {
  const safe = trustedUrl(value);
  if (!safe) return '';
  const url = new URL(safe);
  if (url.search || url.hash || !/\.(?:png|jpe?g|webp|gif|avif)$/i.test(url.pathname)) return '';
  return safe;
}
function cleanItem(item) {
  if (!item || typeof item !== 'object' || !/^\d{1,15}$/.test(String(item.id))) return null;
  return {
    id: String(item.id), title: cleanText(item.title, 300), originalTitle: cleanText(item.originalTitle, 300),
    poster: safeImage(item.poster), backdrop: safeImage(item.backdrop), year: cleanText(String(item.year || ''), 4),
    rating: Math.min(10, finite(item.rating)), kind: item.kind === 'series' ? 'series' : 'movie',
    genres: Array.isArray(item.genres)?item.genres.filter(x=>typeof x==='string').slice(0,12).map(x=>cleanText(x,100)):[],
    description: cleanText(item.description, 1500), duration: finite(item.duration),
    season: finite(item.season), episode: finite(item.episode),
    parentId: /^\d{1,15}$/.test(String(item.parentId)) ? String(item.parentId) : String(item.id),
  };
}
function cleanSettings(value) {
  const result = { ...DEFAULT_SETTINGS };
  if (!value || typeof value !== 'object') return result;
  if(typeof value.oledShield==='boolean')result.oledShield=value.oledShield;
  if (['default','family'].includes(value.parentalMode)) result.parentalMode=value.parentalMode;
  if (['Arial','Tahoma','Verdana','Times New Roman'].includes(value.subtitleFont)) result.subtitleFont=value.subtitleFont;
  if (['none','shadow','outline'].includes(value.subtitleEdge)) result.subtitleEdge=value.subtitleEdge;
  if (['off', 'ar', 'en'].includes(value.subtitleLanguage)) result.subtitleLanguage = value.subtitleLanguage;
  if ([80, 100, 125, 150, 200].includes(Number(value.subtitleSize))) result.subtitleSize = Number(value.subtitleSize);
  if (typeof value.subtitleBackground === 'boolean') result.subtitleBackground = value.subtitleBackground;
  if (['bottom', 'raised'].includes(value.subtitlePosition)) result.subtitlePosition = value.subtitlePosition;
  if (['contain', 'cover', 'fill'].includes(value.aspect)) result.aspect = value.aspect;
  if (['dark', 'light'].includes(value.theme)) result.theme = value.theme;
  if (['ar','en'].includes(value.uiLanguage)) result.uiLanguage=value.uiLanguage;
  if (['small','medium','large'].includes(value.fontSize)) result.fontSize=value.fontSize;
  return result;
}

export function createStore(storage, now = () => Date.now(), vault = storage === undefined ? createVault() : null) {
  const memory = new Map();
  let writable = true;
  let mirrorPending=Promise.resolve(),restored=0;
  const valid=(name,v)=>name==='settings'?v&&typeof v==='object'&&!Array.isArray(v):Array.isArray(v);
  function mirror(name,value){if(vault)mirrorPending=mirrorPending.catch(()=>{}).then(()=>vault.set(name,value)).catch(()=>{});}
  function backend() {
    try { return storage === undefined ? globalThis.localStorage : storage; } catch (_) { return null; }
  }
  function read(name, fallback) {
    if (memory.has(name)) return memory.get(name);
    try {
      const target=backend();
      let shadow;try{shadow=JSON.parse(target?.getItem(PREFIX+name+'.backup')||'null')}catch(_){}
      if(shadow && shadow.value!=null && (name==='settings'?typeof shadow.value==='object'&&!Array.isArray(shadow.value):Array.isArray(shadow.value)))return shadow.value;
      const value = target?.getItem(PREFIX + name);
      if (!value || value.length > 1500000) return fallback;
      const parsed = JSON.parse(value);
      return valid(name,parsed) ? parsed : fallback;
    } catch (_) { return fallback; }
  }
  function write(name, value) {
    memory.set(name, value);
    mirror(name,value);
    try {
      const target = backend();
      if (!target) { writable = false; return false; }
      let saved=false;
      try{target.setItem(PREFIX+name+'.backup',JSON.stringify({value,savedAt:now()}));saved=true}catch(_){}
      try{target.setItem(PREFIX + name, JSON.stringify(value));saved=true}catch(_){}
      if(!saved)throw Error('Storage unavailable');
      writable = true;
      return true;
    } catch (_) { writable = false; return false; }
  }
  function favorites() {
    const raw = read('favorites', []);
    return (Array.isArray(raw) ? raw : []).map(cleanItem).filter(Boolean).slice(0, FAVORITES_LIMIT);
  }
  function localProgress(key) {
    try {
      const raw = backend()?.getItem(PREFIX + key);
      return raw && raw.length <= 1500000 ? JSON.parse(raw) : null;
    } catch (_) { return null; }
  }
  function mergeProgress(...copies) {
    const entries = new Map();
    for (const copy of copies) {
      if (!Array.isArray(copy)) continue;
      for (const entry of copy) {
        const item = cleanItem(entry);
        if (!item || !Number.isFinite(entry.position) || entry.position < 0) continue;
        const duration = finite(entry.duration);
        const updatedAt = finite(entry.updatedAt);
        const previous = entries.get(item.id);
        if (previous && previous.updatedAt >= updatedAt) continue;
        entries.set(item.id, {
          ...item, position: duration ? Math.min(duration, entry.position) : entry.position,
          duration, updatedAt,
        });
      }
    }
    return Array.from(entries.values()).sort((a, b) => b.updatedAt - a.updatedAt).slice(0, PROGRESS_LIMIT);
  }
  function progress() {
    if (memory.has('progress')) return mergeProgress(memory.get('progress'));
    return mergeProgress(localProgress('progress'), localProgress('progress.backup')?.value);
  }
  return {
    async ready(){
      if(!vault)return;
      try {
        const saved = await vault.get('progress');
        const current = progress();
        const merged = mergeProgress(current, saved);
        if (JSON.stringify(current) !== JSON.stringify(merged)) restored++;
        if (merged.length) write('progress', merged);
      } catch (_) {
        // A read failure is not evidence that the mirror is empty.
      }
      for(const name of ['favorites','settings']){
        const local=read(name,null);
        if(local!==null){const clean=name==='favorites'?favorites():cleanSettings(local);mirror(name,clean);continue;}
        try{const saved=await vault.get(name);if(valid(name,saved)){memory.set(name,saved);const clean=name==='favorites'?favorites():cleanSettings(saved);write(name,clean);restored++;}}catch(_){}
      }
    },
    recovered(){return restored},
    flush(){return mirrorPending},
    favorites,
    isFavorite(id) { return favorites().some(item => item.id === String(id)); },
    toggleFavorite(item) {
      const clean = cleanItem(item);
      if (!clean) return false;
      const current = favorites();
      const exists = current.some(entry => entry.id === clean.id);
      write('favorites', (exists ? current.filter(entry => entry.id !== clean.id) : [clean, ...current]).slice(0, FAVORITES_LIMIT));
      return !exists;
    },
    progress,
    getProgress(id) { return progress().find(item => item.id === String(id)) || null; },
    saveProgress(item, position, duration) {
      const clean = cleanItem(item);
      if (!clean || !Number.isFinite(Number(position)) || Number(position) < 0) return false;
      const length = finite(duration) || clean.duration;
      const saved = { ...clean, position: length > 0 ? Math.min(length, Number(position)) : Number(position), duration: length, updatedAt: now() };
      return write('progress', [saved, ...progress().filter(entry => entry.id !== clean.id)].slice(0, PROGRESS_LIMIT));
    },
    settings() { return cleanSettings(read('settings', DEFAULT_SETTINGS)); },
    saveSettings(patch) {
      const result = cleanSettings({ ...cleanSettings(read('settings', DEFAULT_SETTINGS)), ...patch });
      write('settings', result);
      return result;
    },
    // Allows the UI to disclose a session-only fallback when storage is full.
    persistent() { return writable && Boolean(backend()); },
  };
}

export const store = createStore();
