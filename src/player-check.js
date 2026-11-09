// Explicit local developer diagnostic; never enabled on a normal launch.
export async function runPlayerCheck({player,go,api,store,startPlayback,familyOnly=false}) {
 const report={version:'0.6.0',checks:[],userAgent:navigator.userAgent};
 const publish=()=>document.title='PLAYER_CHECK:'+JSON.stringify(report);
 const record=(name,pass,details={})=>{report.checks.push({name,pass,...details});publish();if(!pass)throw Error(name)};
 const wait=async(fn,ms=40000)=>{const start=Date.now();while(!fn()){if(Date.now()-start>ms)throw Error('timeout');await new Promise(r=>setTimeout(r,100))}};
 const key=(key,code)=>{const el=document.activeElement;const event=new KeyboardEvent('keydown',{key,keyCode:code,bubbles:true,cancelable:true});el.dispatchEvent(event);if(key==='Enter'&&!event.defaultPrevented)el.click();};
 const click=id=>document.querySelector('[data-focus="'+id+'"]').click();
 const focused=()=>document.activeElement.dataset.focus;
 const saved=store.settings();
 try {
  store.saveSettings({parentalMode:'default'});
  if(!familyOnly){
  await go({name:'settings'});
  record('parental-settings-present',!!document.querySelector('[data-focus="setting-parental-family"]'));
  for(const size of ['medium','large']){click('setting-font-'+size);const bottom=document.querySelector('[data-focus="settings-terms"]').getBoundingClientRect().bottom;record('settings-fit-'+size,bottom<innerHeight-25,{bottom,viewport:innerHeight});}
  click('setting-font-'+saved.fontSize);
  const episodes=await api.episodes('1312247');const first=episodes[0],second=episodes[1];
  await startPlayback({...await api.details(first.id),kind:'series',parentId:'1312247'},true);
  await wait(()=>player.video.readyState>=2&&!player.video.paused&&!player.loading);
  record('native-series-video',player.video.videoWidth>0,{width:player.video.videoWidth,height:player.video.videoHeight});
  player.hideControls();key('ArrowDown',40);record('down-reveals-play',focused()==='player-play'&&player.controlsVisible);
  key('Enter',13);record('ok-pauses',player.video.paused);key('Enter',13);await wait(()=>!player.video.paused);record('ok-resumes',true);
  key('ArrowRight',39);record('right-selects-next',focused()==='player-next');
  key('ArrowLeft',37);record('left-returns-play',focused()==='player-play');
  key('ArrowUp',38);record('up-selects-timeline',focused()==='player-timeline');
  const before=player.video.currentTime;key('ArrowRight',39);record('timeline-seek-30s',player.video.currentTime>=before+29,{before,after:player.video.currentTime});
  key('ArrowUp',38);record('up-clears-overlay',!player.controlsVisible);
  key('ArrowUp',38);await wait(()=>player.libraryLoaded);record('both-shelves',!!player.root.querySelector('[data-shelf="episodes"]')&&!!player.root.querySelector('[data-shelf="recommendations"]'));
  key('ArrowDown',40);record('current-episode-focus',document.activeElement.getAttribute('aria-current')==='true');
  key('ArrowDown',40);record('down-recommendations',document.activeElement.dataset.relatedType==='recommendations');
  key('ArrowUp',38);record('up-current-episode',document.activeElement.getAttribute('aria-current')==='true');
  key('ArrowUp',38);record('up-transport',focused()==='player-play');
  const idleStart=performance.now();await wait(()=>!player.controlsVisible,7000);const elapsed=performance.now()-idleStart;record('five-second-idle-hide',elapsed>=4800&&elapsed<6200,{elapsed:Math.round(elapsed)});
  key('ArrowDown',40);player._showPanel('caption-settings');
  const sizes=[...player.panel.querySelectorAll('[data-player-action="subtitle-size"]')];record('four-caption-sizes',sizes.length===4);
  sizes.find(b=>b.dataset.value==='200').click();record('extra-large-applied',store.settings().subtitleSize===200&&parseFloat(player.captions.style.fontSize)===6.2);
  player.panel.querySelector('[data-player-action="subtitle-edge"][data-value="outline"]').click();
  player.panel.querySelector('[data-player-action="subtitle-font"][data-value="Verdana"]').click();
  record('caption-style-applied',player.captions.style.fontFamily.includes('Verdana')&&player.captions.style.textShadow.includes('1px'));
  key('Escape',27);record('back-clears-panel',!player.controlsVisible&&!player.panelName);
  key('ArrowUp',38);player._showPanel('subtitles');await wait(()=>!player.controlsVisible,7000);record('menu-idle-hide',player.panel.hidden);
  key('ArrowUp',38);key('ArrowRight',39);key('Enter',13);
  await wait(()=>player.item?.id===second.id&&!player.loading&&!player.video.paused);record('next-episode-button',true,{id:player.item.id});
  player.hideControls();key('ArrowUp',38);key('ArrowLeft',37);key('Enter',13);
  await wait(()=>player.item?.id===first.id&&!player.loading&&!player.video.paused);record('previous-episode-button',true,{id:player.item.id});
  player.video.currentTime=player.video.duration-1.5;
  await wait(()=>player.item?.id===second.id&&!player.loading&&!player.video.paused);record('native-ended-auto-next',player.video.currentTime<20);
  player.close();
  }
  store.saveSettings({parentalMode:'family'});
  report.mediaEvents=[];
  const capture=event=>{report.mediaEvents.push({event:event.type,time:player.video.currentTime,ready:player.video.readyState,paused:player.video.paused,seeking:player.video.seeking,quality:player.sourceIndex,skipFrom:player.root.dataset.lastSkipFrom});report.mediaEvents=report.mediaEvents.slice(-20);publish()};
  for(const event of ['playing','waiting','seeking','seeked','pause','stalled','error'])player.video.addEventListener(event,capture);
  await startPlayback(await api.details('653'),true);
  await wait(()=>player.skipsReady&&!player.loading&&!player.video.paused&&player.video.readyState>=2);
  record('real-source-skip-markers',player.skips.length>0,{count:player.skips.length});
  const interval=player.skips[0];player.video.currentTime=interval.start-1.2;
  await wait(()=>player.video.currentTime>=interval.end+.15&&!player.video.seeking&&!player.familyMasked,25000);
  record('real-family-skip',!player.video.paused,{start:interval.start,end:interval.end,after:player.video.currentTime});
  const position=player.video.currentTime;await wait(()=>player.video.currentTime>position+.4);record('continues-after-skip',true);
  player.video.currentTime=interval.start+2;
  await wait(()=>player.video.currentTime>=interval.end+.15&&!player.familyMasked,15000);record('manual-seek-guard',true);
  player.close();report.pass=true;
 } catch(error) {report.pass=false;report.error=error.message;report.media={time:player.video.currentTime,duration:player.video.duration,paused:player.video.paused,loading:player.loading,seeking:player.video.seeking,ready:player.video.readyState,network:player.video.networkState,masked:player.familyMasked,quality:player.sourceIndex,error:player.video.error?.code||0,buffered:Array.from({length:player.video.buffered.length},(_,i)=>[player.video.buffered.start(i),player.video.buffered.end(i)])};player.close();}
 finally {store.saveSettings(saved);await go({name:'home'});report.finishedAt=new Date().toISOString();publish();}
}
