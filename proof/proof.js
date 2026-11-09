const $=id=>document.getElementById(id),v=$('video');let sources=[],events=[];
const log=(event,data={})=>{events.push({event,...data});$('results').textContent=JSON.stringify({origin:location.origin,events},null,2)};
const get=async path=>{const r=await fetch('https://cinemana.shabakaty.cc/api/android/'+path,{credentials:'omit'});if(!r.ok)throw Error('HTTP '+r.status);return r.json()};
for(const name of ['loadedmetadata','playing','pause','seeked','ended','error'])v.addEventListener(name,()=>log(name,{time:v.currentTime,duration:v.duration,width:v.videoWidth,height:v.videoHeight,error:v.error?.code}));
$('load').onclick=async()=>{try{v.pause();v.replaceChildren();$('sub').innerHTML='<option value="off">إيقاف</option>';const id=$('id').value;if(!/^\d+$/.test(id))throw Error('معرف غير صالح');const [info,files,subs]=await Promise.all([get('allVideoInfo/id/'+id),get('transcoddedFiles/id/'+id),get('translationFiles/id/'+id)]);$('title').textContent=info.ar_title||info.en_title;$('description').textContent=info.ar_content||info.en_content;$('poster').src=info.imgMediumThumbObjUrl||info.imgObjUrl;sources=files.filter(f=>f.container==='mp4');$('quality').replaceChildren(...sources.map((s,i)=>new Option(s.resolution,String(i))));for(const s of subs.translations||[]){if(s.extention!=='vtt')continue;const t=document.createElement('track');t.kind='subtitles';t.label=s.name;t.srclang=s.type;const sr=await fetch(s.file,{credentials:'omit'});if(!sr.ok)throw Error('Subtitle HTTP '+sr.status);t.src=URL.createObjectURL(new Blob([await sr.text()],{type:'text/vtt'}));t.addEventListener('load',()=>log('subtitle-loaded',{language:s.type,cues:t.track.cues?.length}));t.addEventListener('error',()=>log('subtitle-error',{language:s.type}));v.append(t);$('sub').add(new Option(s.type==='ar'?'العربية':'English',s.type))}v.src=sources[0].videoUrl;v.load();log('api-loaded',{id,title:info.en_title,qualities:sources.map(s=>s.resolution),subtitles:Array.from(v.querySelectorAll('track')).map(t=>t.srclang)});}catch(e){log('failure',{message:e.message})}};
$('quality').onchange=()=>{const time=v.currentTime,paused=v.paused;v.src=sources[Number($('quality').value)].videoUrl;v.addEventListener('loadedmetadata',()=>{v.currentTime=time;if(!paused)v.play().catch(e=>log('play-rejected',{message:e.message}))},{once:true});v.load()};
$('sub').onchange=()=>{for(const t of v.textTracks)t.mode=t.language===$('sub').value?'showing':'disabled';log('subtitle-selected',{language:$('sub').value})};
$('play').onclick=()=>v.play().catch(e=>log('play-rejected',{message:e.message}));$('pause').onclick=()=>v.pause();$('back').onclick=()=>v.currentTime=Math.max(0,v.currentTime-30);$('forward').onclick=()=>v.currentTime=Math.min(v.duration-1,v.currentTime+30);
$('report').onclick=()=>log('snapshot',{time:v.currentTime,duration:v.duration,paused:v.paused,width:v.videoWidth,height:v.videoHeight,ready:v.readyState,posterLoaded:$('poster').naturalWidth>0,quality:sources[Number($('quality').value)]?.resolution,tracks:Array.from(v.textTracks).map(t=>({language:t.language,mode:t.mode,cues:t.cues?.length}))});

// This installed diagnostic app exercises its own player on the real TV.
// The DevTools target title exposes only a sanitized result, never media URLs.
async function runTvProof(){
 const checks=[];const report={device:'webOS',origin:location.protocol,userAgent:navigator.userAgent,checks};
 const wait=async(test,timeout=30000)=>{const start=Date.now();while(!test()){if(Date.now()-start>timeout)throw Error('test-timeout');await new Promise(r=>setTimeout(r,150));}};
 const record=(name,details)=>{checks.push({name,...details});document.title='CINEMANA_PROOF:'+JSON.stringify(report);log('tv-test',{name,...details});};
 try{
  await $('load').onclick();await wait(()=>v.readyState>=2&&$('poster').naturalWidth>0);
  record('metadata-and-poster',{pass:true,title:$('title').textContent,duration:v.duration});
  await v.play();const initial=v.currentTime;await wait(()=>v.currentTime>initial+1);
  record('native-playback',{pass:true,width:v.videoWidth,height:v.videoHeight});
  v.pause();const pausedAt=v.currentTime;await new Promise(r=>setTimeout(r,500));record('pause',{pass:v.paused&&Math.abs(v.currentTime-pausedAt)<.2});
  v.currentTime=60;await wait(()=>!v.seeking&&Math.abs(v.currentTime-60)<1);record('seek-forward',{pass:true,time:v.currentTime});
  v.currentTime=30;await wait(()=>!v.seeking&&Math.abs(v.currentTime-30)<1);record('seek-back',{pass:true,time:v.currentTime});
  for(const language of ['ar','en']){$('sub').value=language;$('sub').onchange();await wait(()=>Array.from(v.textTracks).some(t=>t.language===language&&t.mode==='showing'&&t.cues?.length));record('subtitle-'+language,{pass:true,cues:Array.from(v.textTracks).find(t=>t.language===language).cues.length});}
  const quality=sources.findIndex(s=>s.resolution==='1080p');if(quality<0)throw Error('1080-not-available');$('quality').value=String(quality);$('quality').onchange();await wait(()=>v.readyState>=2&&v.videoWidth>=1900&&Math.abs(v.currentTime-30)<2);
  record('quality-switch',{pass:v.paused,width:v.videoWidth,height:v.videoHeight,time:v.currentTime});
  await v.play();await wait(()=>v.currentTime>31);record('resume',{pass:true,time:v.currentTime});v.pause();
  report.pass=checks.every(c=>c.pass);report.finishedAt=new Date().toISOString();document.title='CINEMANA_PROOF:'+JSON.stringify(report);$('results').textContent=JSON.stringify(report,null,2);
 }catch(error){v.pause();report.pass=false;report.error=error.message;document.title='CINEMANA_PROOF:'+JSON.stringify(report);$('results').textContent=JSON.stringify(report,null,2);}
}
if(window.PalmSystem)setTimeout(runTvProof,1000);

