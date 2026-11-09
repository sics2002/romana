import {itemTitle} from './localized-content.js';
import { skipTarget } from './parental.js';
import {t,translateTree} from './i18n.js';
const HLS_TYPES = ['application/vnd.apple.mpegurl', 'application/x-mpegURL'];
const MEDIA_KEYS = { 13: 'Enter', 19: 'MediaPause', 37: 'ArrowLeft', 38: 'ArrowUp', 39: 'ArrowRight', 40: 'ArrowDown', 412: 'MediaRewind', 413: 'MediaStop', 415: 'MediaPlay', 417: 'MediaFastForward', 461: 'Back', 8: 'Backspace', 27: 'Escape' };

/** Native webOS playback only. URLs are used exactly as supplied by the API. */
export function playableSources(sources, video) {
  return (Array.isArray(sources) ? sources : []).filter(source => {
    if (!source || typeof source.url !== 'string') return false;
    let url;
    try { url = new URL(source.url); } catch (_) { return false; }
    if (!['https:', 'http:'].includes(url.protocol)) return false;
    const type = String(source.type || '').toLowerCase();
    if (type.includes('dash') || /\.mpd$/i.test(url.pathname)) return false;
    if (type.includes('mpegurl') || /\.m3u8$/i.test(url.pathname)) {
      return HLS_TYPES.some(mime => Boolean(video.canPlayType(mime)));
    }
    return (type === 'video/mp4' || /\.mp4$/i.test(url.pathname)) && Boolean(video.canPlayType('video/mp4'));
  });
}

export function clampPosition(position, duration) {
  const wanted = Number(position);
  if (!Number.isFinite(wanted) || wanted < 0) return 0;
  return Number.isFinite(duration) && duration > 0 ? Math.min(wanted, Math.max(0, duration - 0.25)) : wanted;
}

export function formatTime(value) {
  const seconds = Math.floor(Math.max(0, Number(value) || 0));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = String(seconds % 60).padStart(2, '0');
  return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${remainder}` : `${minutes}:${remainder}`;
}

export class TVPlayer {
  constructor({ root, api, store, onClose, onFocus, onNotice }) {
    this.root = root;
    this.api = api;
    this.store = store;
    this.onClose = onClose;
    this.onFocus = onFocus;
    this.onNotice = onNotice;
    this.session = 0;
    this.loadSequence = 0;
    this.subtitleSequence = 0;
    this.item = null;
    this.sources = [];
    this.subtitles = [];
    this.sourceIndex = 0;
    this.subtitleIndex = -1;
    this.subtitleUrl = null;
    this.loading = false;
    this.lastSaved = 0;
    this.panelName = null;
    this.settings = Object.assign({ subtitleLanguage: 'off', subtitleSize: 100, subtitleBackground: true, subtitlePosition: 'bottom', aspect: 'contain' }, store.settings());
    root.classList.add('tv-player');
    root.hidden = true;
    root.dataset.playerState = 'closed';
    root.innerHTML = `
      <video class="player-video" playsinline preload="metadata" aria-label="مشغّل الفيديو"></video>
      <div class="family-mask" hidden aria-hidden="true"></div>
      <div class="subtitle-overlay" aria-live="off" hidden><span></span></div>
      <div class="player-shade"></div>
      <header class="player-header"><button type="button" class="player-button player-back-icon" data-focus="player-back" data-player-action="close" aria-label="رجوع">➜</button><div><h2 class="player-title"></h2><p class="player-stream-info"></p></div></header>
      <p class="player-status" role="status" aria-live="polite"></p>
      <p class="seek-feedback" hidden></p>
      <section class="player-error" role="alert" hidden><p></p><button type="button" class="player-button" data-focus="player-retry" data-player-action="retry">إعادة المحاولة</button><button type="button" class="player-button" data-focus="player-error-close" data-player-action="close">رجوع</button></section>
      <section class="player-controls" aria-label="التحكم بالتشغيل">
        <div class="timeline-area">
          <div class="player-progress" tabindex="0" data-focus="player-timeline" role="slider" aria-label="تقدم المشاهدة" aria-valuemin="0" aria-valuemax="100"><div class="player-progress-fill"></div></div>
          <div class="player-time" dir="ltr"><span class="player-current">0:00</span><span class="player-duration">0:00</span></div>
        </div>
        <div class="player-button-line" dir="ltr">
          <div class="player-tools">
            <button type="button" class="player-button" data-focus="player-quality" data-player-action="quality">تلقائي</button>
            <button type="button" class="player-button" data-focus="player-subtitles" data-player-action="subtitles">الترجمة</button>
            <button type="button" class="player-button" data-focus="player-caption-settings" data-player-action="caption-settings">حجم الخط</button>
            <button type="button" class="player-button" data-focus="player-parental" data-player-action="parental">الرقابة</button>
          </div>
          <div class="player-transport">
            <button type="button" class="player-button" data-focus="player-previous" data-player-action="previous" aria-label="الحلقة السابقة">Ⅰ◀</button>
            <button type="button" class="player-button center-play" data-focus="player-play" data-player-action="play" aria-label="إيقاف مؤقت">Ⅱ</button>
            <button type="button" class="player-button" data-focus="player-next" data-player-action="next" aria-label="الحلقة التالية">▶Ⅰ</button>
          </div>
        </div>
        <div class="player-library" hidden><p class="player-library-note"></p><div class="player-library-rows"></div></div>
      </section>
      <section class="player-panel" role="dialog" aria-modal="true" aria-label="خيارات المشغّل" hidden><h3></h3><p class="player-panel-note"></p><div class="player-panel-actions" data-focus-group="player-panel"></div></section>`;
    this.video = root.querySelector('video');
    this.captions = root.querySelector('.subtitle-overlay');
    // Do not set crossOrigin. The verified native MP4 path uses no-CORS media embedding.
    this.controls = root.querySelector('.player-controls');
    this.header = root.querySelector('.player-header');
    this.shade = root.querySelector('.player-shade');
    this.status = root.querySelector('.player-status');
    this.errorBox = root.querySelector('.player-error');
    this.panel = root.querySelector('.player-panel');
    this.playButton = root.querySelector('[data-player-action="play"]');
    this._onClick = event => {
      const button = event.target.closest('[data-player-action]');
      if(button&&root.contains(button)){if(!button.disabled)void this._action(button.dataset.playerAction,button.dataset.value);return}
      if(!this.item||this.loading||!this.errorBox.hidden||this.panelName)return;
      const timeline=event.target.closest('.player-progress');
      if(timeline){const r=timeline.getBoundingClientRect();if(r.width&&Number.isFinite(this.video.duration))this.video.currentTime=clampPosition((event.clientX-r.left)/r.width*this.video.duration,this.video.duration);this.showControls();return}
      if(!event.target.closest('.player-library'))void this.togglePlay();
    };
    root.addEventListener('click', this._onClick);
    this.mediaHandlers = {
      timeupdate: () => { this._guardFamily(); this._updateTime(); this._renderCaptions(); if (Date.now() - this.lastSaved >= 5000) this._saveProgress(); },
      durationchange: () => this._updateTime(),
      playing: () => { if (this.item) { clearTimeout(this.bufferTimer); this._state('playing'); this._message(''); this._updatePlay(); this._scheduleHide(); } },
      pause: () => { if (this.item && !this.loading && this.errorBox.hidden) { this._state(this.video.ended ? 'ended' : 'paused'); this._saveProgress(); this._updatePlay(); this.showControls(); } },
      waiting: () => { if (this.item) {this._message('جارٍ تحميل الفيديو…');this._autoBufferFallback();} },
      seeking: () => this._guardFamily(),
      seeked: () => { if (!this._guardFamily()) this._revealFamily(); if (this.item && !this.loading) this._message(''); },
      ended: () => { void this._onEnded(); },
      error: () => { if (this.item && !this.loading && this.video.error && this.video.error.code !== 1) this._showError(this._mediaErrorMessage()); }
    };
    Object.entries(this.mediaHandlers).forEach(([name, handler]) => this.video.addEventListener(name, handler));
    this._onVisibility = () => { if (document.hidden && this.item) { this._saveProgress(); this.video.pause(); } };
    this._onPageHide = () => { this._saveProgress(); if (this.item) this.video.pause(); };
    document.addEventListener('visibilitychange', this._onVisibility);
    window.addEventListener('pagehide', this._onPageHide);
    this._applySettings();
  }

  async open(item, { fromStart = false } = {}) {
    this._saveProgress();
    this._resetMedia();
    const session = ++this.session;
    this.item = item;
    this.sessionAbort = new AbortController();
    this.skips = []; this.skipsReady = false; this.libraryLoaded = false; this.libraryLoading = false;
    this.shelves={};this.libraryStage='transport';this.pendingShelfFocus=false;this.root.dataset.libraryStage='transport';this.root.querySelector('.player-library').hidden=true;
    this.root.querySelector('.player-library-rows').replaceChildren?.();
    this.advancing = false;
    this.episodeQueue = item.kind==='series' ? this.api.episodes(item.parentId||item.id,this.sessionAbort?.signal).catch(()=>null) : Promise.resolve([]);
    this.loading = true;
    this.lastSaved = 0;
    this.sources = [];
    this.subtitles = [];
    this.sourceIndex = 0;
    this.subtitleIndex = -1;
    this.root.hidden = false;
    this.root.querySelector('.player-title').textContent = (itemTitle(item) || 'ROMANA')+(item.kind==='series'?' · '+t('الموسم')+' '+(item.season||1)+' · '+t('الحلقة')+' '+(item.episode||1):'');
    this.root.querySelector('.player-stream-info').textContent = '';
    this.errorBox.hidden = true;
    this.panel.hidden = true;
    this.panelName = null;
    this._state('loading');
    this._message('جارٍ جلب مصادر الفيديو…');
    this.seekHold = null;
    this.autoQuality = true;
    Object.assign(this.settings, this.store.settings());
    this._applySettings();
    this.hideControls();
    void this._updateEpisodeButtons(session);
    const progress = fromStart ? null : this.store.getProgress(item.id);
    const position = progress && progress.duration - progress.position > 25 ? progress.position : 0;
    try {
      const result = await this.api.sources(item.id,this.sessionAbort?.signal);
      if (!this._current(session)) return;
      this.sources = playableSources(result.sources, this.video);
      this.subtitles = Array.isArray(result.subtitles) ? result.subtitles : [];
      if (!this.sources.length) throw new Error('NO_NATIVE_SOURCE');
      if (this.settings.parentalMode === 'family') await this._loadSkips(session);
      if (!this._current(session)) return;
      await this._loadSource(this._autoIndex(), position, false, session);
      if (!this._current(session)) return;
      if(this.settings.parentalMode==='family'&&!this.skips.length)this._notice('لا توجد توقيتات تخطٍ لهذا العنوان؛ لا يمكن حجب مشاهد غير محددة لدى المصدر.');
      const preferred = this.subtitles.findIndex(track => track.language === this.settings.subtitleLanguage && this._supportedSubtitle(track));
      if (preferred >= 0) await this._setSubtitle(preferred);
    } catch (error) {
      if (this._current(session) && error.name !== 'AbortError') this._showError(error.message === 'NO_NATIVE_SOURCE' ? 'لا يوجد مصدر يدعمه المشغّل الأصلي لهذا الجهاز. DASH غير مفعّل، وHLS يتطلب دعماً أصلياً.' : 'تعذّر تحميل الفيديو. تحقق من اتصال شبكة سينمانا ثم أعد المحاولة.');
    }
  }

  _current(session) { return Boolean(this.item) && session === this.session; }
  _state(value) { this.root.dataset.playerState = value; }
  _message(value) { this.status.textContent = t(value); this.status.hidden = !value; }
  _notice(value) { if (this.onNotice) this.onNotice(t(value)); else this._message(value); }
  _focus(id) {
    const button = this.root.querySelector(`[data-focus="${id}"]`);
    if (!button || button.disabled || this.root.hidden) return;
    if (this.onFocus) this.onFocus(id);
    else button.focus();
  }

  async _loadSource(index, position, paused, session = this.session) {
    const source = this.sources[index];
    if (!source || !this._current(session)) return;
    if (this.cancelLoad) this.cancelLoad();
    const sequence = ++this.loadSequence;
    this.loading = true;
    this.sourceIndex = index;
    this._updateQualityLabel();
    this._state('loading');
    this._message('جارٍ فتح الفيديو…');
    this.errorBox.hidden = true;
    this.video.pause();
    try {
      await new Promise((resolve, reject) => {
        let done = false;
        const finish = error => {
          if (done) return;
          done = true;
          clearTimeout(timer);
          this.video.removeEventListener('loadedmetadata', loaded);
          this.video.removeEventListener('error', failed);
          if (this.cancelLoad === cancel) this.cancelLoad = null;
          error ? reject(error) : resolve();
        };
        const loaded = () => finish();
        const failed = () => finish(new Error('MEDIA_ERROR'));
        const cancel = () => finish(Object.assign(new Error('Playback changed'), { name: 'AbortError' }));
        const timer = setTimeout(() => finish(new Error('MEDIA_TIMEOUT')), 25000);
        this.cancelLoad = cancel;
        this.video.addEventListener('loadedmetadata', loaded);
        this.video.addEventListener('error', failed);
        this.video.src = source.url;
        this.video.load();
      });
      if (!this._current(session) || sequence !== this.loadSequence) return;
      this.video.currentTime = clampPosition(position, this.video.duration);
      this.loading = false;
      this._guardFamily();
      this.root.dataset.quality = String(source.label || source.height || index + 1);
      this.root.querySelector('.player-stream-info').textContent = t(`${source.label || 'جودة متاحة'} · مشغّل الجهاز الأصلي`);
      this._updateTime();
      this._message('');
      this._applyCuePosition();
      if (!paused) {
        try { await this.video.play(); }
        catch (error) {
          if (!this._current(session) || sequence !== this.loadSequence) return;
          if (error.name === 'NotAllowedError') { this._state('paused'); this._notice('اضغط تشغيل لبدء المشاهدة.'); this.showControls(); this._focus('player-play'); }
          else throw error;
        }
      } else this._state('paused');
      if (this._current(session) && sequence === this.loadSequence) { this._updatePlay(); this._scheduleHide(); }
    } finally {
      if (this._current(session) && sequence === this.loadSequence) this.loading = false;
    }
  }

  async _changeQuality(index, automatic = false) {
    if (index === this.sourceIndex || !this.sources[index] || this.loading) return;
    const session = this.session;
    const position = this.video.currentTime;
    const paused = this.video.paused;
    this._saveProgress();
    if(!automatic)this._closePanel('player-quality');
    try { await this._loadSource(index, position, paused, session); }
    catch (error) { if (this._current(session) && error.name !== 'AbortError') this._showError('تعذّر فتح هذه الجودة. يمكنك إعادة المحاولة أو اختيار جودة أخرى.'); }
  }

  async retry() {
    if (!this.item || this.retrying) return;
    const session = this.session;
    this.retrying = true;
    const position = this.video.currentTime || (this.store.getProgress(this.item.id) || {}).position || 0;
    const label = (this.sources[this.sourceIndex] || {}).label;
    this._message('جارٍ تحديث رابط الفيديو…');
    this.errorBox.hidden = true;
    this._state('loading');
    try {
      const result = await this.api.sources(this.item.id,this.sessionAbort?.signal);
      if (!this._current(session)) return;
      this.sources = playableSources(result.sources, this.video);
      this.subtitles = Array.isArray(result.subtitles) ? result.subtitles : [];
      if (!this.sources.length) throw new Error('NO_NATIVE_SOURCE');
      if (this.settings.parentalMode === 'family' && !this.skipsReady) await this._loadSkips(session);
      if (!this._current(session)) return;
      const selected = Math.max(0, this.sources.findIndex(source => source.label === label));
      await this._loadSource(selected, position, false, session);
      if (this._current(session)) {
        const track = this.subtitles.findIndex(subtitle => subtitle.language === this.settings.subtitleLanguage && this._supportedSubtitle(subtitle));
        await this._setSubtitle(track);
        this._focus('player-play');
      }
    } catch (error) {
      if (this._current(session) && error.name !== 'AbortError') this._showError('ما زال تشغيل الفيديو غير متاح. تحقق من الشبكة أو ارجع واختر مادة أخرى.');
    } finally { if (session === this.session) this.retrying = false; }
  }

  _supportedSubtitle(track) {
    if (!track || typeof track.url !== 'string') return false;
    try { if (!['http:', 'https:'].includes(new URL(track.url).protocol)) return false; } catch (_) { return false; }
    return String(track.format).toLowerCase() === 'vtt' || /\.vtt(?:[?#]|$)/i.test(track.url);
  }

  async _setSubtitle(index) {
    const session = this.session;
    const sequence = ++this.subtitleSequence;
    if (this.subtitleAbort) this.subtitleAbort.abort();
    this._removeTrack();
    this.subtitleIndex = -1;
    this.root.dataset.subtitle = 'off';
    if (index < 0) { this._saveSettings({ subtitleLanguage: 'off' }); return; }
    const subtitle = this.subtitles[index];
    if (!this._supportedSubtitle(subtitle)) { this._notice('صيغة الترجمة هذه غير مدعومة؛ يدعم هذا الإصدار WebVTT.'); return; }
    const controller = new AbortController();
    this.subtitleAbort = controller;
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(subtitle.url, { mode: 'cors', credentials: 'omit', signal: controller.signal });
      if (!response.ok) throw new Error('SUBTITLE_HTTP');
      const content = await response.text();
      if (!/^\uFEFF?WEBVTT(?:[ \t]|\r?\n|$)/.test(content) || content.length > 4 * 1024 * 1024) throw new Error('INVALID_WEBVTT');
      if (!this._current(session) || sequence !== this.subtitleSequence) return;
      this.subtitleUrl = URL.createObjectURL(new Blob([content], { type: 'text/vtt;charset=utf-8' }));
      const track = document.createElement('track');
      track.kind = 'subtitles';
      track.srclang = subtitle.language || 'und';
      track.label = subtitle.label || subtitle.language || 'ترجمة';
      track.src = this.subtitleUrl;
      track.default = true;
      track.addEventListener('load', () => {
        if (!this._current(session) || sequence !== this.subtitleSequence) return;
        track.track.mode = 'hidden';
        this._renderCaptions();
        this._applyCuePosition();
        this.root.dataset.subtitle = subtitle.language || 'available';
        this.root.dataset.subtitleCues = String(track.track.cues ? track.track.cues.length : 0);
      });
      track.addEventListener('error', () => {
        if (this._current(session) && sequence === this.subtitleSequence) {
          this._removeTrack();
          this.subtitleIndex = -1;
          this.root.dataset.subtitle = 'off';
          this._notice('تعذّر عرض الترجمة على هذا الجهاز.');
        }
      });
      this.video.appendChild(track);
      track.track.mode = 'hidden';
      const cueChange = () => { if (this._current(session) && sequence === this.subtitleSequence) this._renderCaptions(); };
      track.track.addEventListener?.('cuechange', cueChange);
      this.detachCueChange = () => track.track.removeEventListener?.('cuechange', cueChange);
      this.subtitleIndex = index;
      this._saveSettings({ subtitleLanguage: subtitle.language || 'off' });
    } catch (error) {
      if (this._current(session) && sequence === this.subtitleSequence) this._notice(error.name === 'AbortError' ? 'انتهت مهلة تحميل الترجمة؛ حاول مرة أخرى.' : 'تعذّر جلب الترجمة. قد تمنع الشبكة أو سياسة CORS تحميلها.');
    } finally { clearTimeout(timeout); if(this.subtitleAbort===controller)this.subtitleAbort=null; }
  }

  _removeTrack() {
    this.detachCueChange?.();
    this.detachCueChange = null;
    if (this.captions) { this.captions.hidden = true; this.captions.querySelector('span').textContent = ''; }
    Array.from(this.video.querySelectorAll('track')).forEach(track => { track.track.mode = 'disabled'; track.remove(); });
    if (this.subtitleUrl) URL.revokeObjectURL(this.subtitleUrl);
    this.subtitleUrl = null;
    delete this.root.dataset.subtitleCues;
  }

  _renderCaptions() {
    if (!this.captions) return;
    const lines = [];
    Array.from(this.video.textTracks || []).filter(track => track.mode === 'hidden').forEach(track => {
      Array.from(track.activeCues || []).forEach(cue => {
        // The browser parses WebVTT; copy only text, never inject subtitle markup.
        lines.push(typeof cue.getCueAsHTML === 'function' ? cue.getCueAsHTML().textContent : String(cue.text || '').replace(/<[^>]*>/g, ''));
      });
    });
    const text = lines.join('\n');
    const span = this.captions.querySelector('span');
    if (span.textContent !== text) span.textContent = text;
    this.captions.hidden = !text;
  }

  _applyCuePosition() {
    Array.from(this.video.textTracks || []).forEach(track => {
      Array.from(track.cues || []).forEach(cue => {
        try { cue.snapToLines = true; cue.line = this.settings.subtitlePosition === 'raised' ? -4 : 'auto'; cue.align = 'center'; } catch (_) { /* Firmware may not expose mutable cues. */ }
      });
    });
  }

  _saveSettings(patch) { Object.assign(this.settings, patch); this.store.saveSettings(patch); this._applySettings(); }
  _applySettings() {
    const scale = [80, 100, 125, 150, 200].includes(Number(this.settings.subtitleSize)) ? Number(this.settings.subtitleSize) : 100;
    this.root.style.setProperty('--subtitle-size', `${3.1 * scale / 100}vh`);
    this.root.style.setProperty('--subtitle-background', this.settings.subtitleBackground ? 'rgba(0, 0, 0, .75)' : 'transparent');
    if (this.captions) {
      this.captions.style.fontSize = `${3.1 * scale / 100}vh`;
      this.captions.style.fontFamily = '"'+(this.settings.subtitleFont || 'Arial')+'", sans-serif';
      this.captions.style.textShadow = this.settings.subtitleEdge === 'outline' ? '-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000,1px 1px 0 #000' : this.settings.subtitleEdge === 'none' ? 'none' : '1px 2px 3px #000';
      this.captions.style.bottom = this.settings.subtitlePosition === 'raised' ? '19vh' : '7vh';
      this.captions.querySelector('span').style.backgroundColor = this.settings.subtitleBackground ? 'rgba(0,0,0,.75)' : 'transparent';
    }
    this.video.style.objectFit = ['contain', 'cover', 'fill'].includes(this.settings.aspect) ? this.settings.aspect : 'contain';
    this._applyCuePosition();
  }

  _audioTracks() { try { return Array.from(this.video.audioTracks || []); } catch (_) { return []; } }

  _autoIndex() {
    const downlink=typeof navigator!=='undefined'?Number(navigator.connection?.downlink):0;
    const cap=downlink>0?(downlink>=20?2160:downlink>=6?1080:downlink>=2?720:480):1080;
    const index=this.sources.findIndex(source=>source.height<=cap);
    return index<0?Math.max(0,this.sources.length-1):index;
  }
  _updateQualityLabel(){const label=this.root.querySelector('[data-player-action="quality"]');if(label)label.textContent=this.autoQuality?t('تلقائي'):(this.sources[this.sourceIndex]?.label||t('الجودة'));}
  _autoBufferFallback(){
    clearTimeout(this.bufferTimer);
    if(!this.autoQuality||this.loading||this.video.paused||this.sourceIndex>=this.sources.length-1)return;
    const session=this.session;
    this.bufferTimer=setTimeout(()=>{if(this._current(session)&&this.autoQuality&&!this.loading&&!this.video.paused&&this.video.readyState<3)void this._changeQuality(this.sourceIndex+1,true)},7000);
  }
  _remoteSeek(key, repeat=false){
    const now=Date.now();
    if(!this.seekHold||this.seekHold.key!==key||(!repeat&&now-this.seekHold.eventAt>350))this.seekHold={key,start:now,eventAt:now,lastAt:-Infinity};
    const hold=this.seekHold;hold.eventAt=now;
    if(now-hold.lastAt<250)return;
    hold.lastAt=now;const elapsed=now-hold.start;
    const step=elapsed>=3000?120:elapsed>=1000?60:30;
    this.seek(key==='ArrowRight'?step:-step,false);
    const feedback=this.root.querySelector('.seek-feedback');
    if(feedback){feedback.textContent=(key==='ArrowRight'?'+':'−')+step+'s';feedback.hidden=false;clearTimeout(this.seekFeedbackTimer);this.seekFeedbackTimer=setTimeout(()=>feedback.hidden=true,800);}
  }
  handleKeyUp(event){const key=MEDIA_KEYS[event.keyCode]||event.key;if(this.seekHold?.key===key)this.seekHold=null;}

  _showPanel(name) {
    this.panelName = name;
    this.panel.dataset.panel = name;
    this.showControls();
    this.panel.hidden = false;
    this.controls.hidden = true;
    this.header.hidden = true;
    const container = this.panel.querySelector('.player-panel-actions');
    container.replaceChildren();
    const note = this.panel.querySelector('.player-panel-note');
    note.textContent = '';
    const add = (label, action, value, selected = false, disabled = false) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'player-button';
      button.textContent = `${selected ? '✓ ' : ''}${t(label)}`;
      button.dataset.playerAction = action;
      button.dataset.value = String(value);
      button.dataset.focus = `player-option-${container.children.length}`;
      button.setAttribute('aria-pressed', String(selected));
      button.disabled = disabled;
      container.appendChild(button);
    };
    const titles = { quality: 'جودة الفيديو', subtitles: 'لغة الترجمة', audio: 'المسار الصوتي', aspect: 'أبعاد الصورة', 'caption-settings': 'مظهر الترجمة' };
    this.panel.querySelector('h3').textContent = t(titles[name] || 'خيارات المشغّل');
    if (name === 'quality') {
      add('تلقائي','select-auto','',this.autoQuality); 
      this.sources.forEach((source, index) => add(source.label || `${source.height || index + 1}`, 'select-quality', index, !this.autoQuality && index === this.sourceIndex));
      note.textContent = 'تعرض هذه القائمة المصادر المتاحة فعلياً. تبديل الجودة يحافظ على موضع المشاهدة.';
    } else if (name === 'more') {
      const title=document.createElement('h4');title.textContent=t('حجم الخط');container.append(title);
      [[80,'صغير'],[100,'متوسط'],[150,'كبير']].forEach(([value,label])=>add(label,'subtitle-size',value,Number(this.settings.subtitleSize)===value));
      const sub=document.createElement('h4');sub.textContent=t('الترجمة');container.append(sub);
      add('بدون ترجمة','select-subtitle',-1,this.subtitleIndex<0);
      for(const [language,label]of [['ar','العربية'],['en','الإنجليزية']]){const index=this.subtitles.findIndex(track=>track.language===language&&this._supportedSubtitle(track));add(label,'select-subtitle',index,index>=0&&index===this.subtitleIndex,index<0);}
    } else if (name === 'subtitles') {
      add('إيقاف الترجمة', 'select-subtitle', -1, this.subtitleIndex < 0);
      this.subtitles.forEach((track, index) => {
        if (!this._supportedSubtitle(track) && this.subtitles.some(other => other.language === track.language && this._supportedSubtitle(other))) return;
        add(`${track.label || track.language || 'ترجمة'}${this._supportedSubtitle(track) ? '' : ' — الصيغة غير مدعومة'}`, 'select-subtitle', index, index === this.subtitleIndex, !this._supportedSubtitle(track));
      });
      if (!this.subtitles.length) note.textContent = 'لا تتوفر ترجمة لهذه المادة.';
    } else if (name === 'audio') {
      const tracks = this._audioTracks();
      tracks.forEach((track, index) => add(track.label || track.language || `مسار ${index + 1}`, 'select-audio', index, track.enabled));
      note.textContent = tracks.length > 1 ? 'المسارات التي يتيحها المشغّل الأصلي.' : 'لا يتيح المصدر أو متصفح هذا الجهاز مسارات صوتية إضافية قابلة للاختيار.';
    } else if (name === 'aspect') {
      [['contain', 'الأبعاد الأصلية'], ['cover', 'ملء الشاشة مع قص الأطراف'], ['fill', 'تمديد الصورة']].forEach(([value, label]) => add(label, 'select-aspect', value, this.settings.aspect === value));
    } else if (name === 'parental') {
      add('افتراضي','select-parental','default',this.settings.parentalMode !== 'family');
      add('عائلي','select-parental','family',this.settings.parentalMode === 'family');
      note.textContent = t('يتخطى فقط المشاهد التي حدّدها المصدر. ') + t(this.skipsReady ? (this.skips.length ? 'تتوفر توقيتات تخطٍ لهذا العنوان.' : 'لا توجد توقيتات تخطٍ لهذا العنوان.') : 'تُفحص التوقيتات قبل تفعيل عائلي.');
    } else if (name === 'caption-settings') {
      [[80,'صغير'],[100,'متوسط'],[150,'كبير'],[200,'كبير جداً']].forEach(([value,label]) => add(label, 'subtitle-size', value, Number(this.settings.subtitleSize) === value));
      const heading=label=>{const h=document.createElement('h4');h.textContent=label;container.append(h)};
      heading('مظهر الحروف');
      [['none','بدون تأثير'],['shadow','ظل بسيط'],['outline','حدود بسيطة']].forEach(([value,label])=>add(label,'subtitle-edge',value,this.settings.subtitleEdge===value));
      heading('نوع الخط');
      ['Arial','Tahoma','Verdana','Times New Roman'].forEach(value=>add(value,'subtitle-font',value,this.settings.subtitleFont===value));
      heading('الخلفية والموضع');
      add(this.settings.subtitleBackground ? 'إلغاء خلفية الترجمة' : 'إظهار خلفية الترجمة', 'subtitle-background', !this.settings.subtitleBackground);
      add(this.settings.subtitlePosition === 'raised' ? 'إرجاع الترجمة للأسفل' : 'رفع موضع الترجمة', 'subtitle-position', this.settings.subtitlePosition === 'raised' ? 'bottom' : 'raised');
      note.textContent = 'يتغيّر الحجم مباشرة. استخدم رجوع لمشاهدة الترجمة على الصورة.';
    }
    add('رجوع', 'panel-back', '');
    translateTree(this.panel);
    const first=container.querySelector('[data-focus]');if(first)this._focus(first.dataset.focus);
  }

  _closePanel(focusId) {
    const name = this.panelName;
    this.panel.hidden = true;
    this.panelName = null;
    this.showControls();
    this._focus(focusId || `player-${name || 'play'}`);
  }

  async _action(action, value) {
    if (!this.item) return;
    this._scheduleHide();
    switch (action) {
      case 'close': this.close(); break;
      case 'play': await this.togglePlay(); break;
      case 'rewind': this.seek(-30); break;
      case 'forward': this.seek(30); break;
      case 'select-related': {
        const selected = this.relatedItems?.find(item => item.id === value);
        if (selected) {
          const session = this.session;
          try { const item = await this.api.details(selected.id); if (this._current(session)) await this.open(item); }
          catch (_) { this._notice('تعذّر فتح هذا العنوان. حاول مرة أخرى.'); }
        }
        break;
      }
      case 'retry': await this.retry(); break;
      case 'previous': await this._changeEpisode(-1); break;
      case 'next': await this._changeEpisode(1); break;
      case 'select-parental': await this._setParental(value); break;
      case 'subtitle-edge': this._saveSettings({subtitleEdge:value}); this._showPanel('caption-settings'); break;
      case 'subtitle-font': this._saveSettings({subtitleFont:value}); this._showPanel('caption-settings'); break;
      case 'parental': case 'more': case 'quality': case 'subtitles': case 'audio': case 'aspect': case 'caption-settings': this._showPanel(action); break;
      case 'select-auto': this.autoQuality=true; this._closePanel('player-quality'); await this._changeQuality(this._autoIndex(),true);this._updateQualityLabel();break;
      case 'select-quality': this.autoQuality=false;this._updateQualityLabel();if (Number(value) === this.sourceIndex) this._closePanel(); else await this._changeQuality(Number(value)); break;
      case 'select-subtitle': this._closePanel(); await this._setSubtitle(Number(value)); break;
      case 'select-audio': this._audioTracks().forEach((track, index) => { track.enabled = index === Number(value); }); this._closePanel(); break;
      case 'select-aspect': this._saveSettings({ aspect: value }); this._closePanel(); break;
      case 'subtitle-size': this._saveSettings({ subtitleSize: Number(value) }); this._showPanel('caption-settings'); break;
      case 'subtitle-background': this._saveSettings({ subtitleBackground: value === 'true' }); this._showPanel('caption-settings'); break;
      case 'subtitle-position': this._saveSettings({ subtitlePosition: value }); this._showPanel('caption-settings'); break;
      case 'panel-back': this._closePanel();this.hideControls(); break;
    }
  }

  async togglePlay() {
    if (!this.item || this.loading) return;
    const session = this.session,intent=(this.toggleSequence||0)+1;this.toggleSequence=intent;
    if (!this.errorBox.hidden) { await this.retry(); return; }
    if (this.video.paused || this.video.ended) {
      try { await this.video.play(); }
      catch (error) { if(this._current(session)&&intent===this.toggleSequence&&!(error.name==='AbortError'&&this.video.paused))this._showError('تعذّر بدء التشغيل. اضغط إعادة المحاولة لتحديث المصدر.'); }
    } else this.video.pause();
    if (!this._current(session)||intent!==this.toggleSequence) return;
    this.showControls();
    this._updatePlay();
  }

  seek(delta, reveal = true) {
    if (!this.item || this.loading || !Number.isFinite(this.video.duration)) return;
    try { this.video.currentTime = clampPosition(this.video.currentTime + delta, this.video.duration); }
    catch (_) { this._notice('التقديم والتأخير غير متاحين في هذا الجزء من المصدر.'); return; }
    this._updateTime();
    if (reveal) this.showControls();
  }

  _updatePlay() { const paused=this.video.paused||this.video.ended;this.playButton.textContent=paused?'▶':'Ⅱ';this.playButton.setAttribute('aria-label',t(paused?'تشغيل':'إيقاف مؤقت')); }
  _updateTime() {
    const duration = Number.isFinite(this.video.duration) ? this.video.duration : 0;
    const position = Math.max(0, this.video.currentTime || 0);
    const percent = duration > 0 ? Math.min(100, position / duration * 100) : 0;
    this.root.querySelector('.player-current').textContent = formatTime(position);
    this.root.querySelector('.player-duration').textContent = formatTime(duration);
    this.root.querySelector('.player-progress-fill').style.width = `${percent}%`;
    this.root.querySelector('.player-progress').setAttribute('aria-valuenow', String(Math.round(percent)));
  }

  _saveProgress() {
    if (!this.item || this.loading || !Number.isFinite(this.video.duration) || this.video.duration <= 0 || this.video.readyState < 1) return;
    this.store.saveProgress(this.item, Math.max(0, this.video.currentTime || 0), this.video.duration);
    this.lastSaved = Date.now();
  }

  showControls() {
    this.controlsVisible = true;
    if(!this.libraryStage)this.libraryStage='transport';
    this.root.dataset.controlsVisible = 'true';
    this.controls.hidden = Boolean(this.panelName);
    this.header.hidden = Boolean(this.panelName);
    this.shade.hidden = false;
    this._scheduleHide();
    if (!this.libraryLoaded && !this.libraryLoading) void this.showRelated();
  }

  _scheduleHide() {
    clearTimeout(this.hideTimer);
    if (!this.item || this.loading || !this.errorBox.hidden) return;
    this.hideTimer = setTimeout(() => this.hideControls(), 5000);
  }

  hideControls() {
    if (!this.item || !this.errorBox.hidden) return;
    clearTimeout(this.hideTimer);
    this.panelName = null; this.panel.hidden = true;
    this.controlsVisible = false;
    this._setLibraryStage('transport',false);
    this.root.dataset.controlsVisible = 'false';
    this.controls.hidden = true;
    this.header.hidden = true;
    this.shade.hidden = true;
    if (typeof document !== 'undefined' && this.root.contains(document.activeElement)) document.activeElement.blur();
  }

  async _onEnded() {
    if(!this.item||this.advancing)return;
    const session=this.session,item=this.item;this.advancing=true;
    this._saveProgress();this._state('ended');
    if(item.kind==='series'){
      try{
        const episodes=await(this.episodeQueue||this.api.episodes(item.parentId||item.id,this.sessionAbort?.signal));
        if(!this._current(session))return;
        if(!episodes)throw Error('episodes unavailable');
        const index=episodes.findIndex(x=>x.id===item.id),next=index>=0?episodes[index+1]:null;
        if(next){this._message('جارٍ تشغيل الحلقة التالية…');const detail=await this.api.details(next.id);if(this._current(session))await this.open({...detail,parentId:item.parentId||item.id,kind:'series'},{fromStart:true});return;}
      }catch(_){if(this._current(session))this._notice('تعذّر تشغيل الحلقة التالية. اخترها من قائمة الحلقات.');}
    }
    if(this._current(session)){this.advancing=false;this.showControls();this._focus('player-play');}
  }

  _setLibraryStage(stage,focus=true){
    this.libraryStage=stage;this.root.dataset.libraryStage=stage;
    const library=this.root.querySelector('.player-library');if(library)library.hidden=stage==='transport';
    for(const section of this.root.querySelectorAll?.('[data-shelf]')||[])section.hidden=section.dataset.shelf!==stage;
    if(this.controls)this.controls.scrollTop=0;
    if(stage==='transport')this.pendingShelfFocus=false;
    if(!focus)return;
    if(stage==='transport'){this.pendingShelfFocus=false;this._focus('player-play');return}
    const shelf=this.shelves?.[stage];
    if(!shelf?.items.length){this.pendingShelfFocus=!this.libraryLoaded;return}
    this.pendingShelfFocus=false;this._renderShelf(stage);
    this._focus('related-'+stage+'-'+shelf.items[shelf.index].id);
  }

  _renderShelf(type){
    const shelf=this.shelves?.[type];if(!shelf?.items.length)return;
    const start=Math.floor(shelf.index/3)*3;
    if(shelf.start===start)return;
    shelf.start=start;shelf.rail.replaceChildren();
    for(const entry of shelf.items.slice(start,start+3)){
      const b=document.createElement('button');b.type='button';b.className='player-button related-card';
      b.dataset.playerAction='select-related';b.dataset.value=entry.id;b.dataset.focus='related-'+type+'-'+entry.id;b.dataset.relatedType=type;
      b.setAttribute('aria-current',String(type==='episodes'&&entry.id===this.item.id));
      if(entry.poster||this.item.poster){const img=document.createElement('img');img.src=entry.poster||this.item.poster;img.alt='';b.append(img)}
      const label=document.createElement('span');
      label.textContent=type==='episodes'?(itemTitle(entry)||itemTitle(this.item))+' · '+t('الموسم')+' '+(entry.season||1)+' · '+t('الحلقة')+' '+(entry.episode||1)+(entry.id===this.item.id?' · '+t('تشاهد الآن'):''):itemTitle(entry);
      b.append(label);shelf.rail.append(b);
    }
  }

  _moveShelf(type,delta){
    const shelf=this.shelves?.[type];if(!shelf?.items.length)return;
    const activeId=typeof document!=='undefined'?document.activeElement?.dataset?.value:null;
    const active=shelf.items.findIndex(x=>x.id===activeId);if(active>=0)shelf.index=active;
    shelf.index=Math.max(0,Math.min(shelf.items.length-1,shelf.index+delta));
    this._renderShelf(type);this._focus('related-'+type+'-'+shelf.items[shelf.index].id);
  }

  async showRelated(){
    const session=this.session,item=this.item;
    if(!item||this.libraryLoading||this.libraryLoaded)return;
    this.libraryLoading=true;const request=(this.relatedRequest||0)+1;this.relatedRequest=request;
    const note=this.root.querySelector('.player-library-note');note.textContent=t('جارٍ التحميل…');
    const container=this.root.querySelector('.player-library-rows');container.replaceChildren();
    try{
      const [episodesResult,relatedResult]=await Promise.allSettled([
        item.kind==='series'?(this.episodeQueue||this.api.episodes(item.parentId||item.id,this.sessionAbort?.signal)):Promise.resolve([]),
        this.api.related(item.parentId||item.id,item.kind,this.sessionAbort?.signal)
      ]);
      if(!this._current(session)||request!==this.relatedRequest)return;
      const episodes=episodesResult.status==='fulfilled'?(episodesResult.value||[]):[];
      const related=relatedResult.status==='fulfilled'?relatedResult.value.filter(x=>x.kind===item.kind&&x.id!==item.id):[];
      this.relatedItems=[...episodes,...related];this.shelves={};
      const add=(title,items,type)=>{
        if(!items.length)return;
        const section=document.createElement('section');section.className='player-shelf';section.dataset.shelf=type;section.hidden=true;
        const heading=document.createElement('h4');heading.textContent=t(title);section.append(heading);
        const rail=document.createElement('div');rail.className='player-related-rail';rail.dataset.focusGroup='player-'+type;section.append(rail);container.append(section);
        const index=type==='episodes'?Math.max(0,items.findIndex(x=>x.id===item.id)):0;
        this.shelves[type]={items,index,start:-1,rail};
        // Hidden shelves do not download posters until the user navigates to them.
      };
      add('حلقات المسلسل',episodes,'episodes');add(item.kind==='series'?'مسلسلات مقترحة':'أفلام مقترحة',related,'recommendations');
      this.libraryLoaded=true;
      note.textContent=t(episodes.length||related.length?'↑ لأدوات المشغّل · ↓ للاقتراحات':'لا توجد مقترحات متاحة لهذا العنوان.');
      if(episodesResult.status==='rejected'||relatedResult.status==='rejected')note.textContent=t('تعذّر تحميل جزء من القائمة. اضغط رجوع وحاول مرة أخرى.');
      let stage=this.libraryStage||'transport';
      if(stage==='episodes'&&!episodes.length)stage='recommendations';
      this._setLibraryStage(stage,this.pendingShelfFocus);
    }catch(_){if(this._current(session))note.textContent=t('تعذّر تحميل القائمة. اضغط رجوع وحاول مرة أخرى.');}
    finally{if(this._current(session))this.libraryLoading=false}
  }

  handleKey(event) {
    if (!this.item || this.root.hidden) return false;
    const key=MEDIA_KEYS[event.keyCode]||event.key;
    const handled=()=>{event.preventDefault();return true};
    this._scheduleHide();
    if (['Back','Escape','Backspace','BrowserBack','GoBack'].includes(key)) {
      if(!this.errorBox.hidden)this.close();else if(this.controlsVisible||this.panelName)this.hideControls();else this.close();
      return handled();
    }
    if (['MediaPlayPause','MediaPlay','MediaPause','MediaStop','MediaRewind','MediaFastForward'].includes(key)) {
      if(key==='MediaStop')this.close();
      else if(key==='MediaRewind')this.seek(-10);
      else if(key==='MediaFastForward')this.seek(10);
      else if(key==='MediaPause'){this.video.pause();this.showControls();}
      else if(key!=='MediaPlay'||this.video.paused)void this.togglePlay();
      return handled();
    }
    if(!key || (!key.startsWith('Arrow') && key!=='Enter' && key!==' '))return false;
    if(!this.controlsVisible && (key==='ArrowLeft'||key==='ArrowRight')){this._remoteSeek(key,event.repeat);return handled();}
    if(!this.controlsVisible){if(key==='Enter'||key===' '){void this.togglePlay();return handled()}this._setLibraryStage('transport',false);this.showControls();this._focus('player-play');return handled();}
    if(this.panelName)return false;
    const element=typeof document!=='undefined'?document.activeElement:null;
    const active=element?.dataset?.focus;
    if(active==='player-timeline'){
      if(key==='ArrowUp')this.hideControls();
      else if(key==='ArrowDown')this._focus('player-play');
      else if(key==='ArrowLeft'||key==='ArrowRight')this._remoteSeek(key,event.repeat);
      else void this.togglePlay();
      return handled();
    }
    if(element?.dataset?.relatedType){
      const type=element.dataset.relatedType;
      if(key==='ArrowUp'){
        this._setLibraryStage(type==='recommendations'&&this.shelves?.episodes?'episodes':'transport');return handled();
      }
      if(key==='ArrowDown'){
        if(type==='episodes'&&this.shelves?.recommendations)this._setLibraryStage('recommendations');return handled();
      }
      if(key==='ArrowLeft'||key==='ArrowRight'){
        const rtl=typeof document==='undefined'||document.documentElement?.dir!=='ltr';
        this._moveShelf(type,(key==='ArrowLeft'?1:-1)*(rtl?1:-1));return handled();
      }
      if(key==='Enter'||key===' '){void this._action('select-related',element.dataset.value);return handled()}
      return handled();
    }
    if(key==='ArrowUp'){this._focus('player-timeline');return handled();}
    if(key==='ArrowDown'){
      const stage=this.item.kind==='series'&&(!this.libraryLoaded||this.shelves?.episodes)?'episodes':'recommendations';
      this._setLibraryStage(stage);if(!this.libraryLoaded&&!this.libraryLoading)void this.showRelated();return handled();
    }
    if(key==='Enter'||key===' '){
      const action=element?.dataset?.playerAction;
      if(action)void this._action(action,element.dataset.value);else void this.togglePlay();
      return handled();
    }
    if(key==='ArrowLeft'||key==='ArrowRight'){
      const ids=['player-quality','player-subtitles','player-caption-settings','player-parental','player-previous','player-play','player-next'].filter(id=>{
        const el=this.root.querySelector('[data-focus="'+id+'"]');return el&&!el.hidden&&!el.disabled;
      });
      const next=ids[ids.indexOf(active)+(key==='ArrowRight'?1:-1)];if(next)this._focus(next);return handled();
    }
    return false;
  }

  async _updateEpisodeButtons(session) {
    try {
      const episodes=await this.episodeQueue;
      if(!this._current(session))return;
      this.episodes=episodes||[];
      const index=this.episodes.findIndex(e=>e.id===this.item.id);
      for(const [action,delta] of [['previous',-1],['next',1]]) {
        const button=this.root.querySelector('[data-player-action="'+action+'"]');
        button.hidden=this.item.kind!=='series';button.disabled=index<0||!this.episodes[index+delta];
      }
    } catch (_) { /* An unavailable queue must not interrupt current playback. */ }
  }

  async _changeEpisode(delta) {
    const session=this.session,item=this.item;
    if(this.advancing)return;
    this.advancing=true;
    try{
      const episodes=await this.episodeQueue,index=episodes?.findIndex(e=>e.id===item.id);
      if(!this._current(session)||index==null||index<0||!episodes[index+delta])return;
      const detail=await this.api.details(episodes[index+delta].id);
      if(this._current(session))await this.open({...detail,parentId:item.parentId||item.id,kind:'series'},{fromStart:true});
    }catch(_){if(this._current(session))this._notice('تعذّر فتح الحلقة. حاول مرة أخرى.');}
    finally{if(this._current(session))this.advancing=false;}
  }

  async _loadSkips(session=this.session) {
    try {
      const intervals=await this.api.skips(this.item.id,this.sessionAbort?.signal);
      if(!this._current(session))return;
      this.skips=intervals;this.skipsReady=true;
      this.root.dataset.skipCount=String(intervals.length);
      if(!intervals.length)this._notice('لا توجد توقيتات تخطٍ لهذا العنوان؛ لا يمكن حجب مشاهد غير محددة لدى المصدر.');
      clearInterval(this.familyTimer);
      this.familyTimer=setInterval(()=>this._guardFamily(),100);
    } catch(error) {
      if(this._current(session)){this.skipsReady=false;this._message('تعذّر تحميل توقيتات الرقابة. أعد المحاولة أو اختر الوضع الافتراضي.');}
      throw error;
    }
  }

  async _setParental(mode) {
    if(!['default','family'].includes(mode))return;
    const session=this.session,paused=this.video.paused;
    if(mode==='family') {
      this._saveSettings({parentalMode:mode});
      this.video.pause();
      try{if(!this.skipsReady)await this._loadSkips(session);}catch(_){if(this._current(session))this._showError('تعذّر تحميل توقيتات الرقابة. أعد المحاولة أو اختر الوضع الافتراضي.');return;}
      if(!this._current(session))return;
    }
    this._saveSettings({parentalMode:mode});
    if(mode==='default')this._revealFamily(true);else this._guardFamily();
    this._showPanel('parental');
    if(!paused)try{await this.video.play();}catch(_){this._notice('اضغط تشغيل لاستئناف الفيديو.');}
  }

  _guardFamily() {
    if(!this.item||this.settings.parentalMode!=='family'||!this.skipsReady||this.loading)return false;
    const target=skipTarget(this.skips||[],this.video.currentTime);
    if(target==null){if(!this.video.seeking)this._revealFamily();return false;}
    // Native decoders may land a few frames before a requested seek. Keep those
    // frames masked while time advances rather than seeking to the same point forever.

    if(!this.familyMasked){this.familyMuted=this.video.muted;this.familyMasked=true;}
    this.root.querySelector('.family-mask').hidden=false;this.video.muted=true;
    if(this.captions)this.captions.style.visibility='hidden';
    if(this.familyLanding?.target===target&&Date.now()-this.familyLanding.at<15000&&this.video.currentTime>=target-10)return true;
    this.familyLanding={target,at:Date.now()};
    this.root.dataset.lastSkipFrom=String(this.video.currentTime);
    try{this.video.currentTime=clampPosition(target,this.video.duration);this.root.dataset.lastSkippedTo=String(target);}
    catch(_){this.video.pause();this._showError('تعذّر تخطي المقطع المحدد. أعد المحاولة.');}
    return true;
  }

  _revealFamily(force=false) {
    if(!force&&this.familyLanding&&Date.now()-this.familyLanding.at<250)return;
    if(!this.familyMasked)return;
    this.root.querySelector('.family-mask').hidden=true;this.video.muted=this.familyMuted;
    if(this.captions)this.captions.style.visibility='';
    this.familyMasked=false;
  }

  _mediaErrorMessage() {
    const code = this.video.error && this.video.error.code;
    if (code === 3) return 'هذا الجهاز لم يستطع فك ترميز الفيديو. جرّب جودة أو مادة أخرى.';
    if (code === 4) return 'المصدر أو ترميز الفيديو غير مدعوم، أو انتهت صلاحية الرابط. أعد المحاولة.';
    return 'انقطع تحميل الفيديو. تحقق من الشبكة ثم أعد المحاولة لتحديث الرابط.';
  }

  _showError(message) {
    this.loading = false;
    this.video.pause();
    this._state('error');
    this._message('');
    this.panel.hidden = true;
    this.panelName = null;
    this._setLibraryStage('transport',false);
    this.errorBox.querySelector('p').textContent = t(message);
    this.errorBox.hidden = false;
    this.showControls();
    this._focus('player-retry');
  }

  _resetMedia() {
    clearInterval(this.familyTimer);this._revealFamily(true);this.familyLanding=null;
    clearTimeout(this.hideTimer);clearTimeout(this.bufferTimer);clearTimeout(this.seekFeedbackTimer);this.seekHold=null;
    this.item = null;
    this.sessionAbort?.abort();
    this.sessionAbort = null;
    this.episodeQueue = null;
    this.relatedItems = [];
    this.shelves = {};
    this.sources = [];
    this.subtitles = [];
    this.skips = [];
    this.root.querySelector('.player-library-rows')?.replaceChildren?.();
    this.panel.querySelector('.player-panel-actions')?.replaceChildren?.();
    this.loadSequence++;
    this.subtitleSequence++;
    if (this.cancelLoad) this.cancelLoad();
    if (this.subtitleAbort) this.subtitleAbort.abort();
    this.subtitleAbort = null;
    this._removeTrack();
    this.loading = false;
    this.retrying = false;
    this.video.pause();
    this.video.removeAttribute('src');
    this.video.load();
  }

  close() {
    if (!this.item) return;
    const item = this.item;
    this._saveProgress();
    this.session++;
    this._resetMedia();
    this.root.hidden = true;
    this.panel.hidden = true;
    this.panelName = null;
    this._state('closed');
    if (this.onClose) this.onClose(item);
  }

  destroy() {
    this.close();
    this._resetMedia();
    this.root.removeEventListener('click', this._onClick);
    Object.entries(this.mediaHandlers).forEach(([name, handler]) => this.video.removeEventListener(name, handler));
    document.removeEventListener('visibilitychange', this._onVisibility);
    window.removeEventListener('pagehide', this._onPageHide);
  }
}
