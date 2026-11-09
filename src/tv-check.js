// Explicit developer-only launch parameter; never runs during normal launches.
export async function runTvCheck({ player, go, api, store }) {
  const report = { version: '0.4.0', userAgent: navigator.userAgent, checks: [] };
  const publish = () => { document.title = 'CINEMANA_CHECK:' + JSON.stringify(report); };
  const record = (name, pass, details = {}) => { report.checks.push({ name, pass, ...details }); publish(); if (!pass) throw Error(name); };
  const wait = async fn => { const start = Date.now(); while (!fn()) { if (Date.now() - start > 30000) throw Error('timeout'); await new Promise(resolve => setTimeout(resolve, 150)); } };
  const key = (name, code) => document.dispatchEvent(new KeyboardEvent('keydown', { key: name, keyCode: code, bubbles: true, cancelable: true }));
  const saved = store.settings();
  try {
    await go({ name: 'search', query: 'Matchbox' });
    const result = document.querySelector('[data-focus^="result-3146561-"]');
    record('search-result', Boolean(result)); result.click();
    await wait(() => document.querySelector('[data-focus="play-3146561"]'));
    const button = document.querySelector('[data-focus="play-3146561"]');
    const rect = button.getBoundingClientRect();
    record('search-play-button-visible', rect.top >= 0 && rect.bottom < innerHeight, { top: rect.top, bottom: rect.bottom, viewport: innerHeight });
    button.click(); await wait(() => player.video.readyState >= 2 && !player.video.paused);
    await wait(() => !player.loading); const time = player.video.currentTime;
    await wait(() => player.video.currentTime > time + .5);
    record('native-playing-controls-hidden', !player.controlsVisible, { width: player.video.videoWidth, height: player.video.videoHeight });
    key('ArrowUp', 38); record('up-reveals-controls', player.controlsVisible);
    const center=player.playButton.getBoundingClientRect(),quality=player.root.querySelector('[data-focus="player-quality"]').getBoundingClientRect(),more=player.root.querySelector('[data-focus="player-more"]').getBoundingClientRect();
    record('transparent-controls-layout',Math.abs(center.x+center.width/2-innerWidth/2)<2&&Math.abs(center.y+center.height/2-innerHeight/2)<2&&quality.x>innerWidth*.7&&more.x<innerWidth*.2);
    player._showPanel('more');record('subtitle-menu-options',player.panel.querySelectorAll('[data-player-action="subtitle-size"]').length===3&&player.panel.querySelectorAll('[data-player-action="select-subtitle"]').length===3);key('Back',461);record('back-dismisses-options-to-video',!player.panelName&&!player.controlsVisible);

    await new Promise(resolve => { player.video.addEventListener('pause', resolve, { once: true }); player.video.pause(); }); player.hideControls();
    player.seek(120 - player.video.currentTime, false); await wait(() => !player.video.seeking);
    key('ArrowRight',39); record('single-right-plus30', Math.abs(player.video.currentTime - 150) < 1);player.handleKeyUp({key:'ArrowRight'});
    key('ArrowRight',39); await wait(() => !player.video.seeking);
    record('second-right-plus30', Math.abs(player.video.currentTime - 180) < 1, { time: player.video.currentTime, controls: player.controlsVisible });
    key('ArrowLeft',37); await wait(() => !player.video.seeking);
    record('left-minus30', Math.abs(player.video.currentTime - 150) < 1);
    await player._setSubtitle(player.subtitles.findIndex(s => s.language === 'ar' && s.format === 'vtt'));
    await wait(() => player.video.textTracks[0]?.cues?.length);
    const cue = Array.from(player.video.textTracks[0].cues).find(c => c.endTime - c.startTime > 1);
    player.video.currentTime = cue.startTime + .5; await wait(() => !player.video.seeking);
    player._renderCaptions(); await wait(() => !player.captions.hidden);
    player._saveSettings({ subtitleSize: 80 }); const small = parseFloat(getComputedStyle(player.captions).fontSize);
    player._saveSettings({ subtitleSize: 150 }); const large = parseFloat(getComputedStyle(player.captions).fontSize);
    record('arabic-caption-visible-size-changes', large > small * 1.8, { small, large, characters: player.captions.textContent.length });
    key('ArrowDown',40); await wait(() => document.querySelector('.related-card'));
    record('movie-recommendations', player.relatedItems.length > 0, { count: player.relatedItems.length });record('recommendations-horizontal-borderless',getComputedStyle(player.panel).borderTopWidth==='0px'&&getComputedStyle(player.panel.querySelector('.player-panel-actions')).flexWrap==='nowrap');
    player.close();
    await go({ name: 'movies' });
    const movie = document.querySelector('.poster-card'); record('catalog-result', Boolean(movie)); movie.click();
    await wait(() => document.querySelector('.detail-actions .primary'));
    const catalogPlay = document.querySelector('.detail-actions .primary').getBoundingClientRect();
    record('catalog-play-button-visible', catalogPlay.top >= 0 && catalogPlay.bottom < innerHeight);
    const series = await api.details('1312247'); await player.open(series);
    await player.showRelated(); record('series-episodes', player.relatedItems?.length > 0, { count: player.relatedItems?.length }); player.close();
    await go({ name: 'settings' }); record('contact-instagram-email', document.querySelector('[data-focus="contact-instagram"]').textContent.includes('@sics2002') && document.querySelector('.contact-email').textContent==='sics2002@gmail.com');
    const click=id=>document.querySelector('[data-focus="'+id+'"]').click();
    click('setting-font-small');const smallUi=parseFloat(getComputedStyle(document.documentElement).fontSize);click('setting-font-large');const largeUi=parseFloat(getComputedStyle(document.documentElement).fontSize);record('interface-font-size',largeUi>smallUi,{smallUi,largeUi});click('setting-font-'+saved.fontSize);
    click('setting-language-en');record('english-interface',document.documentElement.lang==='en'&&document.querySelector('[data-focus="nav-home"]').textContent==='Home');click('setting-language-ar');record('arabic-interface',document.documentElement.dir==='rtl');
    click('settings-terms');await wait(()=>document.querySelector('.terms-page'));record('remote-readable-terms',document.activeElement.dataset.focus==='terms-content');
    await go({name:'home'});
    report.pass = report.checks.every(check => check.pass);
  } catch (error) { report.pass = false; report.error = error.message; player.close(); }
  finally { player._saveSettings(saved); report.finishedAt = new Date().toISOString(); publish(); }
}
