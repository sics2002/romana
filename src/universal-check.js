import {runLayoutCheck} from './layout-check.js';
import {runReleaseCheck} from './release-check.js';
import {requestFeed} from './news-data.js';
export async function runUniversalCheck(context){
 const report={version:'1.1.0',profile:window.cinemanaProfile,checks:[]};
 const check=(name,pass,extra={})=>report.checks.push({name,pass,...extra});
 const profile=window.cinemanaProfile;
 try{
  check('automatic-profile',profile?.mode==='modern'? !window.cinemanaLegacy:!!window.cinemanaLegacy);
  check('correct-runtime-css',document.getElementById('runtime-style').getAttribute('href')===(profile.mode==='modern'?'./styles.css':'./compatible.css'));
  check('lg-device-metadata',!!profile.device?.sdk&&!!profile.device?.model,{model:profile.device?.model,sdk:profile.device?.sdk});
  const favorites=context.store.favorites().length,progress=context.store.progress().length;
  if(profile.mode==='compatible')await runLayoutCheck(context);else await runReleaseCheck(context);
  const nested=document.title;report.behavior=JSON.parse(nested.slice(nested.indexOf(':')+1));
  check('real-device-behavior',report.behavior.pass===true);
  check('personal-library-preserved',favorites===context.store.favorites().length&&progress===context.store.progress().length,{favorites,progress});
  try{const xml=await requestFeed('film');check('native-news-service',/<(?:rss|feed)\b/i.test(xml),{bytes:xml.length})}catch(e){check('native-news-service',false,{error:e.message})}
  report.pass=report.checks.every(x=>x.pass);
 }catch(e){report.pass=false;report.error=e.message}
 document.title='UNIVERSAL_CHECK:'+JSON.stringify(report);
}
