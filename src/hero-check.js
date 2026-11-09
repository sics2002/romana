// Explicit device check. No playback, account or personal-library changes.
export async function runHeroCheck({go,focus}){
 const report={version:'0.9.1',profile:window.cinemanaProfile?.mode,checks:[]};
 const publish=()=>document.title='HERO_CHECK:'+JSON.stringify(report);
 const check=(name,pass,extra={})=>{report.checks.push({name,pass,...extra});publish();if(!pass)throw Error(name)};
 const wait=async(fn,label,ms=15000)=>{const t=Date.now();while(!fn()){if(Date.now()-t>ms)throw Error('timeout:'+label);await new Promise(r=>setTimeout(r,80))}};
 const settle=()=>new Promise(r=>setTimeout(r,700));
 const key=code=>{for(const type of ['keydown','keyup']){const e=document.createEvent('Event');e.initEvent(type,true,true);e.keyCode=code;(document.activeElement||document.body).dispatchEvent(e)}};
 const bounds=()=>{const r=document.querySelector('.hero').getBoundingClientRect();return {top:Math.round(r.top),bottom:Math.round(r.bottom),height:Math.round(r.height)}};
 const full=()=>{const r=bounds();return r.top>=-2&&r.bottom<=innerHeight+2};
 const port=()=>window.cinemanaLegacy?document.getElementById('content'):document.scrollingElement;
 try{
  await go({name:'home'});await settle();focus.focus('hero-detail');await settle();
  await wait(()=>document.querySelector('.hero-backdrop')?.naturalWidth>0,'hero-image');
  check('startup-full-hero',full(),bounds());
  const detail=document.querySelector('[data-focus="hero-detail"]');
  port().scrollTop=document.querySelector('.hero').offsetHeight+150;await settle();
  detail.focus({preventScroll:true});detail.scrollIntoView({block:'nearest',inline:'nearest',behavior:'smooth'});await settle();
  report.oldNearest=bounds();check('old-button-only-scroll-reproduces',report.oldNearest.top< -20,report.oldNearest);
  focus.focus('hero-detail');await settle();check('whole-hero-scroll-recovers',full(),bounds());
  const hero=document.querySelector('.hero');
  for(let cycle=0;cycle<3;cycle++){
   const row=document.querySelector('#content .content-row'),card=row.querySelector('.poster-card');
   focus.focus(card.dataset.focus);await settle();
   check('cycle-'+cycle+'-scrolled-to-row',port().scrollTop>20,{scroll:Math.round(port().scrollTop)});
   key(38);await settle();
   check('cycle-'+cycle+'-Up-restores-whole-hero',document.activeElement.closest('.hero')===hero&&full(),bounds());
  }
  // The lower carousel arrow is especially prone to leaving the image clipped.
  const card=document.querySelector('#content .content-row .poster-card');focus.focus(card.dataset.focus);await settle();
  focus.focus('hero-next');await settle();check('carousel-arrow-reveals-whole-hero',full(),bounds());
  const next=document.querySelector('[data-focus="hero-next"]'),previous=document.querySelector('[data-focus="hero-prev"]');
  const style=getComputedStyle(next,':before');check('font-independent-arrows',next.textContent===''&&previous.textContent===''&&style.borderTopWidth==='2px'&&!!next.getAttribute('aria-label')&&!!previous.getAttribute('aria-label'));
  const slide=hero.dataset.slide;next.click();check('next-arrow-changes-poster',hero.dataset.slide!==slide);previous.click();check('previous-arrow-restores-poster',hero.dataset.slide===slide);
  focus.focus('hero-detail');key(39);const changed=hero.dataset.slide;check('remote-Right-changes-poster',changed!==slide);key(37);check('remote-Left-restores-poster',hero.dataset.slide===slide);
  check('hero-not-recreated-to-recover',document.querySelector('.hero')===hero);
  report.pass=true;
 }catch(e){report.pass=false;report.error=e.message;report.focus=document.activeElement?.dataset.focus}
 finally{await go({name:'home'});report.finishedAt=new Date().toISOString();publish()}
}
