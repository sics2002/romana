// Explicit developer-only TV check. Never runs on a normal launch.
export async function runModernCheck({player,go,api,store}){
 const report={version:'0.5.0',checks:[],userAgent:navigator.userAgent};
 const publish=()=>document.title='MODERN_CHECK:'+JSON.stringify(report);
 const record=(name,pass,details={})=>{report.checks.push({name,pass,...details});publish();if(!pass)throw Error(name)};
 const wait=async(fn,ms=45000)=>{const start=Date.now();while(!fn()){if(Date.now()-start>ms)throw Error('timeout');await new Promise(r=>setTimeout(r,150))}};
 const key=(key,code)=>document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key,keyCode:code,bubbles:true,cancelable:true}));
 const saved=store.settings();const click=id=>document.querySelector('[data-focus="'+id+'"]').click();
 try{
  await wait(()=>!document.getElementById('intro'),4000);record('intro-dismissed',true);
  await go({name:'settings'});record('contact-first',document.querySelector('.settings-modern').firstElementChild.classList.contains('contact-row'));
  for(const size of ['medium','large']){click('setting-font-'+size);const bottom=document.querySelector('[data-focus="settings-terms"]').getBoundingClientRect().bottom;record('settings-fit-'+size,bottom<innerHeight-30,{bottom,viewport:innerHeight})}
  click('setting-font-'+saved.fontSize);
  await go({name:'home'});const hero=document.querySelector('.hero');const before=hero.dataset.slide;key('ArrowRight',39);record('hero-right',hero.dataset.slide!==before);key('ArrowLeft',37);record('hero-left',hero.dataset.slide===before);await wait(()=>hero.dataset.slide!==before,9000);record('hero-auto',true);
  await go({name:'movies',sort:'stars_desc'});record('movie-browse',document.querySelectorAll('.poster-card').length===30);click('search-more');await wait(()=>document.querySelectorAll('.poster-card').length>30);const ratings=[...document.querySelectorAll('.card-rating')].map(x=>Number(x.textContent.replace('★','').trim()));record('server-imdb-pages-descending',ratings.length===60&&ratings.every((x,i)=>!i||ratings[i-1]>=x),{count:ratings.length,first:ratings[0],last:ratings.at(-1)});
  await go({name:'details',id:'1312247'});record('series-details-recommendations',!!document.querySelector('[data-focus-group="detail-related"]'));
  const episodes=await api.episodes('1312247');record('has-next-episode',episodes.length>1);document.querySelector('[data-focus="episode-'+episodes[0].id+'"]').click();
  await wait(()=>player.video.readyState>=2&&!player.video.paused&&!player.loading);record('series-native-playing',true,{width:player.video.videoWidth,height:player.video.videoHeight});
  player.hideControls();key('ArrowDown',40);await wait(()=>player.panel.querySelector('[data-shelf="recommendations"]'));record('episodes-and-series-suggestions',!!player.panel.querySelector('[data-shelf="episodes"]'),{episodes:player.panel.querySelectorAll('[data-related-type="episodes"]').length,recommendations:player.panel.querySelectorAll('[data-related-type="recommendations"]').length});record('current-episode-marked',document.activeElement.getAttribute('aria-current')==='true');
  key('ArrowDown',40);record('down-to-suggestions',document.activeElement.dataset.relatedType==='recommendations');key('ArrowUp',38);record('up-to-current-episode',document.activeElement.getAttribute('aria-current')==='true');key('ArrowUp',38);record('up-back-to-clean-video',!player.panelName&&!player.controlsVisible&&!player.video.paused);
  const next=episodes[1].id;player.video.currentTime=player.video.duration-1.5;
  await wait(()=>player.item?.id===next,45000);await wait(()=>!player.loading&&!player.video.paused&&player.video.readyState>=2);const start=player.video.currentTime;await wait(()=>player.video.currentTime>start+.5);record('native-ended-starts-next-episode',player.video.currentTime<20,{id:next,time:player.video.currentTime});
  player.close();await go({name:'home'});report.pass=true;
 }catch(error){report.pass=false;report.error=error.message;player.close()}
 finally{store.saveSettings(saved);report.finishedAt=new Date().toISOString();publish()}
}
