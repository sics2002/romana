export async function runLegacyCheck({go}) {
 const report={version:'0.7.2',checks:[],userAgent:navigator.userAgent};
 const publish=()=>document.title='LEGACY_CHECK:'+JSON.stringify(report);
 const check=(name,pass,extra={})=>{report.checks.push({name,pass,...extra});publish();if(!pass)throw Error(name)};
 const wait=async(fn,ms=25000)=>{const start=Date.now();while(!fn()){if(Date.now()-start>ms)throw Error('timeout');await new Promise(r=>setTimeout(r,100))}};
 const key=(code)=>{const e=document.createEvent('Event');e.initEvent('keydown',true,true);e.keyCode=code;document.activeElement.dispatchEvent(e)};
 try{
  check('intro-centered',window.legacyIntroGeometry&&Math.abs(window.legacyIntroGeometry.x-innerWidth/2)<8&&Math.abs(window.legacyIntroGeometry.y-innerHeight/2)<8,{geometry:window.legacyIntroGeometry});
  await go({name:'home'});
  check('bounded-home-cards',document.querySelectorAll('.card-rail .poster-card').length<=60,{cards:document.querySelectorAll('.card-rail .poster-card').length});
  const hero=document.querySelector('.hero-backdrop');await wait(()=>hero?.naturalWidth>0);
  check('large-poster-loaded',hero.naturalWidth>0&&getComputedStyle(hero).zIndex==='0',{width:hero.naturalWidth});
  document.querySelector('[data-focus="nav-search"]').focus();
  const nav=['nav-home','nav-movies','nav-series','nav-favorites','nav-continue','nav-settings'];
  for(const name of nav){key(40);check('down-'+name,document.activeElement.dataset.focus===name,{actual:document.activeElement.dataset.focus,mode:document.documentElement.dataset.mode,event:window.legacyLastKey})}
  for(let i=0;i<5;i++)key(38);
  check('up-returns-home',document.activeElement.dataset.focus==='nav-home');
  key(37);check('left-enters-content',!document.activeElement.closest('#navigation'),{focus:document.activeElement.dataset.focus});
  const before=document.activeElement;key(40);check('down-moves-in-content',document.activeElement!==before,{focus:document.activeElement.dataset.focus});
  const steps=[];for(const code of [37,37,39,40,37,39,38,40]){const start=performance.now();key(code);steps.push(Math.round(performance.now()-start))}
  check('arrow-handling-time',steps.every(x=>x<250),{milliseconds:steps});
  check('deferred-offscreen-images',document.querySelectorAll('img[data-legacy-src]').length>0,{deferred:document.querySelectorAll('img[data-legacy-src]').length});
  report.pass=true;
 }catch(e){report.pass=false;report.error=e.message}
 finally{await go({name:'home'});publish()}
}
