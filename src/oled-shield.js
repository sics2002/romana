import {createWordmark} from './wordmark.js';
import {t} from './i18n.js';
const PATH=[[0,0],[2,0],[2,2],[0,2],[-2,2],[-2,0],[-2,-2],[0,-2],[2,-2]];
export function shieldState({enabled,elapsed=0,idleFor=0,playing=false,hidden=false}){
 if(!enabled||hidden)return {x:0,y:0,rest:false};
 const [x,y]=PATH[Math.max(0,Math.floor(elapsed/60000))%PATH.length];
 return {x,y,rest:!playing&&idleFor>=120000};
}
export class OledShield{
 constructor({doc=document,win=window,now=()=>Date.now()}={}){
  Object.assign(this,{doc,win,now});this.enabled=false;this.started=now();this.lastInput=now();
  this.rest=doc.createElement('div');this.rest.id='oled-rest';this.rest.hidden=true;this.rest.setAttribute('aria-label',t('شاشة سكون'));
  const mark=createWordmark(doc);this.rest.append(mark);doc.body.append(this.rest);
  this.input=e=>{if(e.type==='click'&&this.wakeUntil>this.now()){e.preventDefault();e.stopImmediatePropagation();this.wakeUntil=0;return}const wake=!this.rest.hidden;this.activity();if(wake){this.wakeUntil=e.type!=='keydown'||[13,32].includes(e.keyCode)||['Enter',' '].includes(e.key)?this.now()+500:0;e.preventDefault();e.stopImmediatePropagation();this.wakeKey=e.keyCode||null}};
  this.release=e=>{if(this.wakeKey&&this.wakeKey===e.keyCode){e.preventDefault();e.stopImmediatePropagation();this.wakeKey=null}};
  this.media=()=>this.activity();this.visibility=()=>{if(doc.hidden)this.tick();else this.activity()};
  for(const name of ['keydown','pointerdown','mousedown','touchstart','wheel','click'])doc.addEventListener(name,this.input,true);
  doc.addEventListener('keyup',this.release,true);doc.addEventListener('visibilitychange',this.visibility);
  for(const name of ['play','pause','ended'])doc.addEventListener(name,this.media,true);
  this.timer=null;this.motion=()=>{if(this.now()-this.lastInput>1000)this.activity()};doc.addEventListener('mousemove',this.motion,true);
 }
 setEnabled(value){const enabled=!!value;if(this.initialized&&enabled===this.enabled){this.tick();return}this.initialized=true;this.enabled=enabled;this.started=this.now();this.win.clearInterval(this.timer);this.timer=enabled?this.win.setInterval(()=>this.tick(),1000):null;this.activity()}
 activity(){this.lastInput=this.now();this.rest.hidden=true;this.tick()}
 tick(at=this.now()){
  const video=this.doc.querySelector('#player-overlay:not([hidden]) video');
  const playing=!!video&&!video.paused&&!video.ended&&video.readyState>=2;
  const state=shieldState({enabled:this.enabled,elapsed:at-this.started,idleFor:at-this.lastInput,playing,hidden:this.doc.hidden});
  const root=this.doc.documentElement;root.dataset.oledShield=this.enabled?'on':'off';
  root.style.setProperty('--oled-x',state.x+'px');root.style.setProperty('--oled-y',state.y+'px');this.rest.hidden=!state.rest;
  return state;
 }
 destroy(){this.win.clearInterval(this.timer);for(const name of ['keydown','pointerdown','mousedown','touchstart','wheel','click'])this.doc.removeEventListener(name,this.input,true);this.doc.removeEventListener('mousemove',this.motion,true);this.doc.removeEventListener('keyup',this.release,true);this.doc.removeEventListener('visibilitychange',this.visibility);for(const name of ['play','pause','ended'])this.doc.removeEventListener(name,this.media,true);this.rest.remove();this.doc.documentElement.dataset.oledShield='off';this.doc.documentElement.style.setProperty('--oled-x','0px');this.doc.documentElement.style.setProperty('--oled-y','0px')}
}
