import {createStore} from './storage.js';
export async function runLayoutCheck({go,api,player,store,startPlayback}){
 const report={version:'0.7.3',checks:[]};const publish=()=>document.title='LAYOUT_CHECK:'+JSON.stringify(report);
 const check=(name,pass,extra={})=>{report.checks.push({name,pass,...extra});publish()};
 const wait=async(fn,ms=45000)=>{const t=Date.now();while(!fn()){if(Date.now()-t>ms)throw Error('timeout');await new Promise(r=>setTimeout(r,100))}};
 const key=code=>{const e=document.createEvent('Event');e.initEvent('keydown',true,true);e.keyCode=code;document.activeElement.dispatchEvent(e)};
 report.rowBounds=[];const visible=el=>{const r=el.getBoundingClientRect();if(r.top<0||r.bottom>innerHeight)report.rowBounds.push({top:r.top,bottom:r.bottom,height:r.height,scroll:window.pageYOffset,focus:el.dataset.focus,documentHeight:document.documentElement.scrollHeight,bodyHeight:document.body.scrollHeight});return r.top>=0&&r.bottom<=innerHeight};
 const original=player.store,isolated=createStore(null);isolated.saveSettings({...store.settings(),parentalMode:'default'});
 try{
  const data=await api.home();await go({name:'home'});
  let sections=[...document.querySelectorAll('#content .content-row')];let visited=0,visibleRows=true;
  if(sections.length)sections[0].querySelector('.poster-card').focus();
  for(let guard=0;guard<100;guard++){
   const section=document.activeElement.closest('.content-row');if(section){visited++;key(40);await new Promise(r=>setTimeout(r,250));const next=document.activeElement.closest('.content-row');if(next)visibleRows=visibleRows&&visible(document.activeElement);if(next===section&&visited<sections.length)throw Error('stuck-row-'+visited)}
   const more=document.querySelector('[data-focus="home-more-sections"]');
   if(document.activeElement===more&&!more.hidden){more.click();continue}
   sections=[...document.querySelectorAll('#content .content-row')];if(visited>=sections.length)break;
  }
  check('all-home-sections-reachable',visited>=data.rows.length,{visited,expected:data.rows.length});
  check('focused-rows-inside-viewport',visibleRows);
  document.getElementById('content').scrollTop=500;report.beforePlayScroll=document.getElementById('content').scrollTop;check('opened-from-scrolled-content',report.beforePlayScroll>0);
  player.store=isolated;await startPlayback(await api.details('653'),true);
  await wait(()=>!player.loading&&!player.video.paused&&player.video.readyState>=2);
  const rectangle=()=>{const r=player.video.getBoundingClientRect();return {top:r.top,left:r.left,width:r.width,height:r.height}};
  const full=()=>{const r=rectangle();return Math.abs(r.top)<1&&Math.abs(r.left)<1&&Math.abs(r.width-innerWidth)<1&&Math.abs(r.height-innerHeight)<1&&window.pageYOffset===0};
  check('video-fullscreen-after-scrolled-page',full(),rectangle());
  check('background-page-hidden',getComputedStyle(document.getElementById('app')).display==='none');
  player.showControls();player.root.querySelector('[data-focus="player-play"]').focus();key(38);key(37);key(40);
  check('controls-do-not-shift-video',full(),rectangle());
  player._showPanel('caption-settings');const last=[...player.panel.querySelectorAll('[data-focus]')].pop();if(last){last.focus();last.scrollIntoView({block:'nearest'})}
  check('menu-scrolling-does-not-shift-video',full(),rectangle());
  player.hideControls();const t=player.video.currentTime;await wait(()=>player.video.currentTime>t+.5);check('native-video-keeps-playing',!player.video.paused,{width:player.video.videoWidth});
  player.close();player.store=original;check('page-restored-on-close',getComputedStyle(document.getElementById('app')).display!=='none'&&!window.legacyPlaying);
  report.pass=report.checks.every(x=>x.pass);
 }catch(e){report.pass=false;report.error=e.message;player.close()}
 finally{player.store=original;await go({name:'home'});publish()}
}
