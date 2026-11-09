// Optional platform primitives on the WebKit engines in webOS 1/2.
if(!window.performance)window.performance={};
if(!window.performance.now){const epoch=Date.now();window.performance.now=()=>Date.now()-epoch;}
if(!window.requestAnimationFrame)window.requestAnimationFrame=window.webkitRequestAnimationFrame?window.webkitRequestAnimationFrame.bind(window):fn=>setTimeout(()=>fn(performance.now()),16);
if(!window.MutationObserver&&window.WebKitMutationObserver)window.MutationObserver=window.WebKitMutationObserver;
// DOM compatibility for the Chromium 38 engine in webOS 3.x.
if(!Element.prototype.matches)Element.prototype.matches=Element.prototype.webkitMatchesSelector;
if(!Element.prototype.closest)Element.prototype.closest=function(selector){let node=this;while(node){if(node.matches(selector))return node;node=node.parentElement}return null};
for(const proto of [Element.prototype,DocumentFragment.prototype]){
 if(!proto.append)proto.append=function(...nodes){for(const node of nodes)this.appendChild(typeof node==='string'?document.createTextNode(node):node)};
 if(!proto.prepend)proto.prepend=function(...nodes){for(let i=nodes.length-1;i>=0;i--)this.insertBefore(typeof nodes[i]==='string'?document.createTextNode(nodes[i]):nodes[i],this.firstChild)};
 if(!proto.replaceChildren)proto.replaceChildren=function(...nodes){while(this.firstChild)this.removeChild(this.firstChild);this.append(...nodes)};
}
if(!Element.prototype.remove)Element.prototype.remove=function(){if(this.parentNode)this.parentNode.removeChild(this)};
if(!Element.prototype.toggleAttribute)Element.prototype.toggleAttribute=function(name,force){const add=force===undefined?!this.hasAttribute(name):force;if(add)this.setAttribute(name,'');else this.removeAttribute(name);return add};
if(!('inert' in HTMLElement.prototype))Object.defineProperty(HTMLElement.prototype,'inert',{get(){return this.hasAttribute('inert')},set(value){this.toggleAttribute('inert',!!value)}});
if(!window.queueMicrotask)window.queueMicrotask=fn=>Promise.resolve().then(fn);
// Old scrollIntoView treats an options object as alignToTop and loses the viewport.
const nativeScroll=Element.prototype.scrollIntoView;
Element.prototype.scrollIntoView=function(options){
 if(typeof options!=='object')return nativeScroll.call(this,options);
 const inPlayer=!!this.closest('.tv-player');let parent=this.parentElement;
 while(parent&&parent!==document.body&&parent!==document.documentElement){
  const style=getComputedStyle(parent),p=parent.getBoundingClientRect(),r=this.getBoundingClientRect();
  if(parent.scrollHeight>parent.clientHeight&&/auto|scroll/.test(style.overflowY)){if(r.top<p.top)parent.scrollTop-=p.top-r.top;else if(r.bottom>p.bottom)parent.scrollTop+=r.bottom-p.bottom;}
  if(parent.scrollWidth>parent.clientWidth&&/auto|scroll/.test(style.overflowX)){
   const before=parent.scrollLeft,delta=r.left<p.left?r.left-p.left:r.right>p.right?r.right-p.right:0;
   if(delta){parent.scrollLeft=before+delta;const after=this.getBoundingClientRect();if(Math.abs(after.left-p.left)>Math.abs(r.left-p.left)+1)parent.scrollLeft=before-delta;}
  }
  parent=parent.parentElement;
 }
 if(!inPlayer){const target=this;const ensure=()=>{if(document.activeElement!==target||window.legacyPlaying)return;const r=target.getBoundingClientRect();const delta=r.top<70?r.top-70:r.bottom>innerHeight-65?r.bottom-innerHeight+65:0;if(delta){const y=Math.max(0,window.pageYOffset+delta);window.scrollTo(0,y);document.documentElement.scrollTop=y;document.body.scrollTop=y}};ensure();requestAnimationFrame(ensure);}
};
let savedPageY=0,savedContentY=0;
window.legacySetPlayback=active=>{const app=document.getElementById('app');if(active&&!window.legacyPlaying){savedPageY=window.pageYOffset;savedContentY=document.getElementById('content').scrollTop;window.legacyPlaying=true;app.style.display='none';document.documentElement.classList.add('legacy-playing');window.scrollTo(0,0)}else if(!active&&window.legacyPlaying){window.legacyPlaying=false;document.documentElement.classList.remove('legacy-playing');app.style.display='';document.getElementById('content').scrollTop=savedContentY;window.scrollTo(0,savedPageY)}};
const nativeFocus=HTMLElement.prototype.focus;
let focusTimer;HTMLElement.prototype.focus=function(){const target=this,x=window.pageXOffset,y=window.pageYOffset;nativeFocus.call(this);if(window.legacyPlaying)window.scrollTo(x,y);else{clearTimeout(focusTimer);focusTimer=setTimeout(()=>{if(document.activeElement===target&&!window.legacyPlaying)target.scrollIntoView({block:'nearest'})},120)}};
document.documentElement.classList.add('legacy-tv');

// webOS 3 remotes expose keyCode/keyIdentifier rather than standard key names.
const remoteKeys={13:'Enter',32:' ',37:'ArrowLeft',38:'ArrowUp',39:'ArrowRight',40:'ArrowDown',461:'Back',27:'Escape',8:'Backspace'};
for(const type of ['keydown','keyup'])document.addEventListener(type,event=>{const key=remoteKeys[event.keyCode||event.which];window.legacyLastKey={code:event.keyCode,key:event.key,mapped:key};if(key&&event.key!==key)try{Object.defineProperty(event,'key',{value:key})}catch(_){}},true);

window.cinemanaLegacy=true;
if(!('isConnected' in Node.prototype))Object.defineProperty(Node.prototype,'isConnected',{get(){return document.documentElement.contains(this)}});
if(!Element.prototype.scrollBy)Element.prototype.scrollBy=function(x,y){if(typeof x==='object'){this.scrollTop+=Number(x.top)||0;this.scrollLeft+=Number(x.left)||0}else{this.scrollLeft+=Number(x)||0;this.scrollTop+=Number(y)||0}};
