import {createStore} from './storage.js';
// Developer-only journey: complete remote gestures, real native IME and video.
export async function runRemotePlayerCheck({go,api,player,store,startPlayback}){
 const report={version:'0.9.0',checks:[],profile:window.cinemanaProfile?.mode,keyboardShown:0,keyboardHidden:0,method:'DOM keydown+keyup, native IME events and decoder'};
 const publish=()=>document.title='REMOTE_CHECK:'+JSON.stringify(report);
 const check=(name,pass,extra={})=>{report.checks.push({name,pass,...extra});publish();if(!pass)throw Error(name)};
 const wait=async(fn,label,ms=50000)=>{const t=Date.now();while(!fn()){if(Date.now()-t>ms)throw Error('timeout:'+label);await new Promise(r=>setTimeout(r,80))}};
 const key=code=>{for(const type of ['keydown','keyup']){const el=document.activeElement||document.body,e=document.createEvent('Event');e.initEvent(type,true,true);e.keyCode=code;el.dispatchEvent(e)}};
 const keyboard=e=>{if(e.detail?.visibility)report.keyboardShown++;else report.keyboardHidden++};document.addEventListener('keyboardStateChange',keyboard);
 const original=player.store,isolated=createStore(null);isolated.saveSettings({...store.settings(),parentalMode:'default'});
 const personal={favorites:store.favorites().length,progress:store.progress().length};
 const library=()=>player.root.querySelector('.player-library');
 const visibleShelf=()=>[...player.root.querySelectorAll('[data-shelf]')].filter(x=>!x.hidden);
 const stage=async type=>{await wait(()=>player.libraryStage===type&&player.shelves?.[type]&&document.activeElement.dataset.relatedType===type,'stage-'+type);await new Promise(r=>setTimeout(r,180))};
 const fullscreen=()=>{const r=player.video.getBoundingClientRect();return Math.abs(r.left)<2&&Math.abs(r.top)<2&&Math.abs(r.width-innerWidth)<2&&Math.abs(r.height-innerHeight)<2};
 try{
  for(const page of ['movies','series','search']){
   await go({name:page});const entry=document.querySelector('[data-focus="search-entry"]');entry.focus();
   const before=report.keyboardShown;key(13);
   await wait(()=>report.keyboardShown>before,'keyboard-'+page,10000);await new Promise(r=>setTimeout(r,400));
   check(page+'-OK-release-keeps-IME',!document.querySelector('input[type=search]').hidden&&document.activeElement.tagName==='INPUT'&&document.querySelector('.search-form').dataset.keyboardVisible==='true');
   const hidden=report.keyboardHidden;key(461);await wait(()=>report.keyboardHidden>hidden,'keyboard-close',10000);
   check(page+'-Back-restores-navigation',document.activeElement.dataset.focus==='search-category');
  }
  player.store=isolated;const episodes=await api.episodes('653');check('series-has-more-than-three',episodes.length>6);
  const entry=episodes[Math.min(3,episodes.length-2)],nextId=episodes[episodes.indexOf(entry)+1].id;
  await startPlayback({...await api.details(entry.id),kind:'series',parentId:'653'},true);
  await wait(()=>!player.loading&&!player.video.paused&&player.video.readyState>=2,'series-playing');
  check('series-native-decoder',player.video.videoWidth>0,{width:player.video.videoWidth,height:player.video.videoHeight});
  player.hideControls();check('clean-no-shelf-space',library().hidden&&fullscreen());
  key(40);check('Down-transport-only',player.controlsVisible&&library().hidden&&document.activeElement.dataset.focus==='player-play');
  key(40);await stage('episodes');
  const first=[...visibleShelf()[0].querySelectorAll('[data-focus]')];
  check('episodes-only-three',visibleShelf().length===1&&first.length===3,{count:first.length});
  const bounds=first.map(x=>x.getBoundingClientRect());check('three-large-cards-fit',bounds.every(r=>r.left>=0&&r.right<=innerWidth&&r.bottom<=innerHeight&&r.width>innerWidth*.24),{width:Math.round(bounds[0].width)});
  await wait(()=>first.every(x=>x.querySelector('img')?.naturalWidth>0),'episode-images');check('episode-posters-loaded',true);
  check('current-episode-distinct',first.some(x=>x.getAttribute('aria-current')==='true'&&getComputedStyle(x).backgroundColor!=='rgba(0, 0, 0, 0)'));
  check('series-season-episode-label',first.every(x=>x.textContent.includes('الموسم')&&x.textContent.includes('الحلقة'))&&player.root.querySelector('.player-title').textContent.includes('الموسم'));
  const initialIds=first.map(x=>x.dataset.value).join(',');for(let i=0;i<3;i++)key(37);
  check('Left-pages-next-three',visibleShelf()[0].querySelectorAll('[data-focus]').length===3&&[...visibleShelf()[0].querySelectorAll('[data-focus]')].map(x=>x.dataset.value).join(',')!==initialIds&&document.activeElement.dataset.relatedType==='episodes');
  key(40);await stage('recommendations');
  check('recommendations-only-three',visibleShelf().length===1&&visibleShelf()[0].dataset.shelf==='recommendations'&&visibleShelf()[0].querySelectorAll('[data-focus]').length===3);
  const recBefore=document.activeElement.dataset.value;for(let i=0;i<3;i++)key(37);check('recommendation-Left-more',player.shelves.recommendations.items.length<=3||document.activeElement.dataset.value!==recBefore);
  check('shelf-video-stays-fullscreen',fullscreen());
  key(38);await stage('episodes');key(38);check('Up-restores-transport',library().hidden&&document.activeElement.dataset.focus==='player-play');
  key(38);check('Up-focuses-timeline',document.activeElement.dataset.focus==='player-timeline');
  const before=player.video.currentTime;key(39);check('timeline-seek-forward',player.video.currentTime>=before+29);
  await wait(()=>!player.video.seeking&&player.video.readyState>=2,'timeline-seek');key(38);check('timeline-Up-clears-UI',!player.controlsVisible&&fullscreen());
  const clean=player.video.currentTime;key(39);check('clean-Right-seeks',!player.controlsVisible&&player.video.currentTime>=clean+29);
  await wait(()=>!player.video.seeking,'clean-seek');const forward=player.video.currentTime;key(37);check('clean-Left-rewinds',player.video.currentTime<forward-20&&!player.controlsVisible);
  await wait(()=>!player.video.seeking&&player.video.readyState>=2,'rewind');
  key(13);await wait(()=>player.video.paused,'OK-pause');check('clean-OK-pauses',true);
  player.hideControls();key(13);await wait(()=>!player.video.paused,'OK-resume');check('clean-OK-resumes',true);
  player.hideControls();player.video.click();await wait(()=>player.video.paused,'pointer-pause');check('pointer-click-pauses',true);
  player.video.click();await wait(()=>!player.video.paused,'pointer-resume');check('pointer-click-resumes',true);
  player.hideControls();key(40);key(40);await stage('episodes');key(461);check('Back-clears-shelves',!player.controlsVisible&&library().hidden);
  key(40);key(40);await stage('episodes');await wait(()=>!player.controlsVisible,'idle-hide',7000);check('five-second-shelf-hide',library().hidden);
  player.video.currentTime=player.video.duration-1.5;await wait(()=>player.item?.id===nextId&&!player.loading&&!player.video.paused,'auto-next',60000);check('native-end-auto-next',player.video.currentTime<20);
  player.close();await startPlayback(await api.details('112607'),true);await wait(()=>!player.loading&&!player.video.paused&&player.video.readyState>=2,'movie-playing');
  player.hideControls();key(40);check('movie-transport-no-posters',library().hidden);
  key(40);await stage('recommendations');check('movie-three-recommendations',!player.shelves.episodes&&visibleShelf().length===1&&visibleShelf()[0].querySelectorAll('[data-focus]').length===3);
  key(38);check('movie-Up-transport',library().hidden&&document.activeElement.dataset.focus==='player-play');
  check('movie-fullscreen',fullscreen());player.close();player.store=original;
  check('personal-records-unchanged',store.favorites().length===personal.favorites&&store.progress().length===personal.progress);
  report.pass=true;
 }catch(e){report.pass=false;report.error=e.message;report.state={stage:player.libraryStage,focus:document.activeElement?.dataset.focus,error:player.video.error?.code||0,message:player.errorBox.querySelector('p').textContent,ready:player.video.readyState,paused:player.video.paused,loading:player.loading};player.close()}
 finally{player.store=original;document.removeEventListener('keyboardStateChange',keyboard);await go({name:'home'});report.finishedAt=new Date().toISOString();publish()}
}
