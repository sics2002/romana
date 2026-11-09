// Explicit viewport checks supplement IntersectionObserver after keyboard/scroll layout changes.
const pending=new Set();let active=0,timer;
const observer=new IntersectionObserver(()=>schedule(),{rootMargin:'180px'});
function visible(img){const r=img.getBoundingClientRect();return r.width>0&&r.height>0&&r.bottom>-180&&r.top<window.innerHeight+180&&r.right>0&&r.left<window.innerWidth}
function schedule(){clearTimeout(timer);timer=setTimeout(drain,50)}
function drain(){
 for(const img of pending){
  if(!img.isConnected){observer.unobserve(img);pending.delete(img);continue}
  if(active>=3)break;
  if(!visible(img))continue;
  pending.delete(img);observer.unobserve(img);start(img);
 }
}
function start(img){
 active++;img.dataset.posterState='loading';let done=false;
 const finish=ok=>{if(done)return;done=true;clearTimeout(timeout);img.onload=null;img.onerror=null;active--;
  if(ok){img.hidden=false;img.dataset.posterState='loaded';img.parentNode?.classList.remove('no-image')}
  else if(img.isConnected&&Number(img.dataset.posterAttempts)<3){img.dataset.posterState='retry';setTimeout(()=>{if(img.isConnected){pending.add(img);schedule()}},500*Number(img.dataset.posterAttempts))}
  else{img.dataset.posterState='failed';img.hidden=true;img.parentNode?.classList.add('no-image')}
  schedule();
 };
 img.dataset.posterAttempts=String(Number(img.dataset.posterAttempts||0)+1);
 img.onload=()=>finish(img.naturalWidth>0);img.onerror=()=>finish(false);
 const timeout=setTimeout(()=>finish(false),12000);
 img.src=img.dataset.posterUrl;
 if(img.complete&&img.naturalWidth>0)finish(true);
}
export function loadPoster(img,url,art){
 img.loading='eager';img.dataset.posterUrl=url;
 if(!url){img.dataset.posterState='missing';img.hidden=true;art.classList.add('no-image');return}
 pending.add(img);observer.observe(img);schedule();
}
export function resetPosters(){observer.disconnect();pending.clear();clearTimeout(timer)}
document.addEventListener('scroll',schedule,true);
document.addEventListener('focusin',schedule,true);
document.addEventListener('keyboardStateChange',schedule);
window.addEventListener('resize',schedule);
