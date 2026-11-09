import {createStore} from './storage.js';
export async function runRomanaCheck({go,activateMode,activation,shield,applyTheme,store,player,api,startPlayback}){
 const report={version:'1.1.0',checks:[],profile:window.cinemanaProfile?.mode};
 const publish=()=>document.title='ROMANA_CHECK:'+JSON.stringify(report);
 const check=(name,pass,extra={})=>{report.checks.push({name,pass,...extra});publish();if(!pass)throw Error(name)};
 const wait=async(fn,label,ms=40000)=>{const t=Date.now();while(!fn()){if(Date.now()-t>ms)throw Error('timeout:'+label);await new Promise(r=>setTimeout(r,100))}};
 const click=id=>{const b=document.querySelector('[data-focus="'+id+'"]');if(!b)throw Error('missing:'+id);b.click()};
 const original=player.store,saved=store.settings(),personal={favorites:store.favorites().length,progress:store.progress().length};
 const isolated=createStore(null);isolated.saveSettings({...saved,parentalMode:'default'});
 try{
  store.saveSettings({uiLanguage:'ar',fontSize:'medium',oledShield:false});applyTheme();await activateMode('cinemana');await go({name:'settings'});
  check('brand-bilingual-credit',document.querySelector('.brand .wordmark-name').textContent==='ROMANA'&&document.querySelector('.brand .wordmark-credit').textContent==='by sics2002');
  check('footer-renamed',document.querySelector('.independent .wordmark-name').textContent==='ROMANA');
  const brand=document.querySelector('.brand').getBoundingClientRect(),credit=document.querySelector('.brand .wordmark-credit').getBoundingClientRect();
  check('brand-inside-screen',brand.left>=0&&credit.right<=innerWidth,{left:Math.round(brand.left),right:Math.round(credit.right)});
  check('larger-navigation',parseFloat(getComputedStyle(document.querySelector('#navigation button')).fontSize)>parseFloat(getComputedStyle(document.documentElement).fontSize)*1.05);
  click('setting-theme-light');check('light-brand-readable',getComputedStyle(document.querySelector('.brand .wordmark-name')).color==='rgb(23, 34, 53)');click('setting-theme-dark');
  for(const size of ['medium','large']){
   click('setting-font-'+size);
   const language=document.querySelector('[data-setting=setting-language]').getBoundingClientRect(),oled=document.querySelector('[data-setting=setting-oled]').getBoundingClientRect(),bottom=document.querySelector('[data-focus=settings-terms]').getBoundingClientRect().bottom;
   check('shield-below-language-'+size,oled.top>=language.bottom-1,{top:Math.round(oled.top),languageBottom:Math.round(language.bottom)});
   check('settings-fit-'+size,bottom<innerHeight-20,{bottom:Math.round(bottom)});
  }
  click('setting-font-medium');click('setting-oled-true');check('shield-preference-applied',store.settings().oledShield&&shield.enabled);
  const shift=shield.tick(shield.started+61000);check('bounded-interface-shift',shift.x===2&&Math.abs(shift.y)<=2&&document.documentElement.style.getPropertyValue('--oled-x')==='2px');
  shield.tick(shield.lastInput+121000);check('idle-rest-shown',!shield.rest.hidden);
  const event=document.createEvent('Event');event.initEvent('keydown',true,true);event.keyCode=38;(document.activeElement||document.body).dispatchEvent(event);
  const up=document.createEvent('Event');up.initEvent('keyup',true,true);up.keyCode=38;(document.activeElement||document.body).dispatchEvent(up);
  check('wake-consumes-first-key',shield.rest.hidden&&event.defaultPrevented&&document.documentElement.dataset.page==='settings');
  activation.reset();for(let i=0;i<5;i++)click('setting-language-ar');check('language-normal-operation',document.documentElement.dataset.mode==='cinemana');click('setting-language-ar');
  await wait(()=>document.documentElement.dataset.mode==='news'&&document.querySelector('[data-focus=news-nav-settings]'),'alternate-view');
  click('news-nav-settings');check('alternate-settings-available',!!document.querySelector('[data-focus=setting-oled-true]'));
  click('setting-font-large');const newsBottom=document.querySelector('[data-focus=settings-terms]').getBoundingClientRect().bottom;check('alternate-settings-large-fit',newsBottom<innerHeight-20,{bottom:Math.round(newsBottom)});click('setting-font-medium');
  await new Promise(r=>setTimeout(r,1500));check('feed-refresh-keeps-settings',document.documentElement.dataset.page==='settings'&&!!document.querySelector('[data-focus=setting-language-ar]'));
  activation.reset();for(let i=0;i<6;i++)click('setting-language-ar');await wait(()=>document.documentElement.dataset.mode==='cinemana'&&document.querySelector('[data-focus=nav-movies]'),'return-view');
  check('alternate-roundtrip',true);
  await new Promise(r=>setTimeout(r,700));check('retired-view-cannot-overwrite',!document.querySelector('[data-focus=news-nav-home]'));
  player.store=isolated;await startPlayback(await api.details('112607'),true);await wait(()=>!player.loading&&!player.video.paused&&player.video.readyState>=2,'native-video');
  shield.tick(shield.lastInput+180000);const rect=player.video.getBoundingClientRect();
  check('playing-video-no-rest',shield.rest.hidden);
  check('native-video-untransformed',getComputedStyle(player.video).transform==='none'&&Math.abs(rect.left)<1&&Math.abs(rect.top)<1&&Math.abs(rect.width-innerWidth)<1&&Math.abs(rect.height-innerHeight)<1,{width:Math.round(rect.width),height:Math.round(rect.height)});
  player.video.pause();player.hideControls();shield.tick(shield.lastInput+121000);check('paused-video-rest',!shield.rest.hidden);
  const wake=document.createEvent('Event');wake.initEvent('keydown',true,true);wake.keyCode=38;document.body.dispatchEvent(wake);const release=document.createEvent('Event');release.initEvent('keyup',true,true);release.keyCode=38;document.body.dispatchEvent(release);
  check('wake-keeps-video-paused',player.video.paused&&!player.controlsVisible&&shield.rest.hidden);
  player.close();player.store=original;
  check('personal-library-preserved',store.favorites().length===personal.favorites&&store.progress().length===personal.progress);
  report.pass=true;
 }catch(e){report.pass=false;report.error=e.message;player.close()}
 finally{player.store=original;store.saveSettings(saved);applyTheme();activation.reset();await activateMode('cinemana');report.finishedAt=new Date().toISOString();publish()}
}
