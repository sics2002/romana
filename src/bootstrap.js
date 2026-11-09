import {selectProfile} from './device-profile.js';
(function(){
 var css=window.CSS,video=document.createElement('video'),hasVault=false;
 try{hasVault=!!window.indexedDB}catch(e){}
 function supports(prop,value){try{return !!(css&&css.supports&&css.supports(prop,value))}catch(e){return false}}
 function media(type){try{return !!video.canPlayType(type)}catch(e){return false}}
 var profile=selectProfile({userAgent:navigator.userAgent,width:window.innerWidth,height:window.innerHeight,
  features:{grid:supports('display','grid'),variables:supports('--profile-test','0'),aspectRatio:supports('aspect-ratio','1 / 1'),flex:supports('display','flex'),lazyImages:'loading' in document.createElement('img'),indexedDB:hasVault},
  media:{mp4:media('video/mp4'),hls:media('application/vnd.apple.mpegurl'),avc:media('video/mp4; codecs="avc1.42E01E"'),hevc:media('video/mp4; codecs="hvc1.1.6.L153.B0"')}});
 window.cinemanaProfile=profile;document.documentElement.setAttribute('data-device-profile',profile.mode);
 function reveal(){document.documentElement.setAttribute('data-romana-ready','')}
 function fail(){document.documentElement.setAttribute('data-romana-boot-error','');reveal();var intro=document.getElementById('intro');if(intro)intro.style.display='none';document.getElementById('content').textContent='تعذّر تحميل التطبيق. أغلقه وافتحه مرة أخرى.';}
 if(profile.mode==='unsupported'){reveal();document.getElementById('intro').style.display='none';document.getElementById('content').textContent='هذا الجهاز يستخدم NetCast، ويحتاج إصداراً مختلفاً عن تطبيق webOS.';return}
 // Read-only LG metadata, asynchronous and optional: startup never waits for Luna.
 if(window.PalmServiceBridge){try{var bridge=new window.PalmServiceBridge();window.cinemanaDeviceBridge=bridge;bridge.onservicecallback=function(raw){try{var info=JSON.parse(raw);if(info.returnValue){profile.device={model:info.modelName||'',sdk:info.sdkVersion||'',firmware:info.firmwareVersion||'',uhd:info.UHD===true||info.UHD==='true'};document.documentElement.setAttribute('data-device-sdk',profile.device.sdk)}}catch(e){}};bridge.call('luna://com.webos.service.tv.systemproperty/getSystemInfo',JSON.stringify({keys:['modelName','firmwareVersion','UHD','sdkVersion']}));}catch(e){}}
 function cursor(event){var visible=event.detail&&event.detail.visibility;if(typeof visible==='boolean')document.documentElement.setAttribute('data-remote-cursor',visible?'visible':'hidden')}
 document.addEventListener('cursorStateChange',cursor);
 document.addEventListener('cursorVisibilityChange',cursor);
 var assetDir=__ROMANA_ASSET_DIR__;
 var style=document.getElementById('runtime-style'),started=false;
 function launch(){if(started)return;started=true;var script=document.createElement('script');script.src=assetDir+(profile.mode==='modern'?'modern.js':'compatible.js');script.onerror=fail;document.body.appendChild(script)}
 style.onload=launch;style.onerror=fail;style.href=assetDir+(profile.mode==='modern'?'styles.css':'compatible.css');
 // Old WebKit does not reliably dispatch link.onload; verify that a stylesheet exists.
 setTimeout(function(){if(!started&&style.sheet)launch()},1500);
 setTimeout(function(){if(!document.documentElement.hasAttribute('data-romana-ready'))fail()},8000);
})();
