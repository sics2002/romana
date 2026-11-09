import {createStore} from './storage.js';
// Explicit device diagnostic; playback writes only to an isolated memory store.
export async function runReleaseCheck({player,go,api,store,startPlayback}) {
 const report={version:'0.7.0',checks:[],personal:{favorites:store.favorites().length,progress:store.progress().length,recovered:store.recovered()}};
 const publish=()=>document.title='RELEASE_CHECK:'+JSON.stringify(report);
 const check=(name,pass,details={})=>{report.checks.push({name,pass,...details});publish();if(!pass)throw Error(name)};
 const wait=async(fn)=>{const start=Date.now();while(!fn()){if(Date.now()-start>40000)throw Error('timeout');await new Promise(r=>setTimeout(r,100))}};
 const key=(key,keyCode)=>{const event=new KeyboardEvent('keydown',{key,keyCode,bubbles:true,cancelable:true});if(event.key!==key)Object.defineProperty(event,'key',{value:key});if(event.keyCode!==keyCode)Object.defineProperty(event,'keyCode',{value:keyCode});document.activeElement.dispatchEvent(event)};
 const original=player.store;const isolated=createStore(null);isolated.saveSettings({...store.settings(),parentalMode:'default'});
 try {
  await store.flush();
  await go({name:'favorites'});
  check('favorites-render',document.querySelectorAll('.poster-card').length===report.personal.favorites);
  await go({name:'continue'});
  report.personal.visibleContinue=store.progress().filter(x=>x.position>10&&(!x.duration||x.duration-x.position>25)).length;
  check('continue-render',document.querySelectorAll('.poster-card').length===report.personal.visibleContinue,{count:report.personal.visibleContinue});
  await go({name:'settings'});
  check('five-social-accounts',document.querySelectorAll('.social-contact').length===5);
  const bottom=document.querySelector('[data-focus="settings-terms"]').getBoundingClientRect().bottom;
  check('settings-fit',bottom<innerHeight,{bottom,viewport:innerHeight});
  await go({name:'search',kind:'movies',category:'77',category2:'67'});
  check('two-genre-selectors',!!document.querySelector('[data-focus="search-category2"]'));
  const genres=[...document.querySelectorAll('.card-genres')].map(x=>x.textContent);
  check('live-genre-intersection',genres.length>0&&genres.every(x=>x.includes('رومانسي')&&x.includes('خيالي')),{matches:genres.length});
  player.store=isolated;
  await startPlayback(await api.details('653'),true);
  await wait(()=>player.video.readyState>=2&&!player.video.paused&&!player.loading);
  check('native-video',player.video.videoWidth>0,{width:player.video.videoWidth});
  player.hideControls();const before=player.video.currentTime;key('ArrowRight',39);
  check('clean-right-seeks',player.video.currentTime>=before+29&&!player.controlsVisible);
  await wait(()=>!player.video.seeking&&player.video.readyState>=2);
  await new Promise(r=>setTimeout(r,400));const forward=player.video.currentTime;key('ArrowLeft',37);
  check('clean-left-rewinds',player.video.currentTime<forward-20&&!player.controlsVisible);
  await wait(()=>!player.video.seeking&&player.video.readyState>=2);
  const position=player.video.currentTime;await wait(()=>player.video.currentTime>position+.4);
  check('continues-after-seek',!player.video.paused);
  player.close();player.store=original;
  check('personal-records-unchanged',store.favorites().length===report.personal.favorites&&store.progress().length===report.personal.progress);
  report.pass=true;
 }catch(error){report.pass=false;report.error=error.message;player.close();}
 finally{player.store=original;await go({name:'home'});report.finishedAt=new Date().toISOString();publish();}
}
