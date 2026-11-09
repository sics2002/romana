import{getLanguage}from './i18n.js';
export async function runLocaleBrandCheck({go,activateMode,applyTheme,shield,store}){
 const report={version:'1.1.0',checks:[],profile:window.cinemanaProfile?.mode};
 const publish=()=>document.title='LOCALE_CHECK:'+JSON.stringify(report);
 const check=(name,pass,extra={})=>{report.checks.push({name,pass,...extra});publish();if(!pass)throw Error(name)};
 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 const click=id=>{const el=document.querySelector('[data-focus="'+id+'"]');if(!el)throw Error('missing:'+id);el.click()};
 const english=selector=>![...document.querySelectorAll(selector)].some(el=>/[\u0600-\u06ff]/.test(el.textContent+' '+(el.getAttribute('placeholder')||'')+' '+(el.getAttribute('aria-label')||'')));
 const key=code=>{for(const type of ['keydown','keyup']){const e=document.createEvent('Event');e.initEvent(type,true,true);e.keyCode=code;(document.activeElement||document.body).dispatchEvent(e)}};
 const saved=store.settings(),personal={favorites:store.favorites().length,progress:store.progress().length};
 try{
  store.saveSettings({uiLanguage:'ar',oledShield:false});applyTheme();await activateMode('cinemana');
  const title=document.querySelector('.brand .wordmark-name'),credit=document.querySelector('.brand .wordmark-credit');
  check('English-wordmark-no-Arabic',title.textContent==='ROMANA'&&!/[\u0600-\u06ff]/.test(document.querySelector('.brand').textContent));
  const tr=title.getBoundingClientRect(),cr=credit.getBoundingClientRect();
  check('credit-below-N-small',cr.top>=tr.bottom-2&&cr.left>=tr.left+tr.width*.6&&cr.left<=tr.left+tr.width*.8&&parseFloat(getComputedStyle(credit).fontSize)<parseFloat(getComputedStyle(title).fontSize)*.4,{nameSize:parseFloat(getComputedStyle(title).fontSize),creditSize:parseFloat(getComputedStyle(credit).fontSize)});
  const footer=document.querySelector('.independent'),fr=footer.getBoundingClientRect();
  check('footer-bottom-right',fr.left>innerWidth*.7&&fr.bottom<=innerHeight&&footer.querySelector('.wordmark-credit').textContent==='by sics');
  await go({name:'home'});check('Arabic-hero-eyebrow',document.querySelector('.hero .eyebrow').textContent==='جديد في رومانا');
  await go({name:'settings'});click('setting-language-en');check('main-settings-English',getLanguage()==='en'&&document.documentElement.dir==='ltr'&&english('#navigation,.settings-heading,.settings-page,.remote-hint'));
  await go({name:'home'});check('English-home-headings',english('.hero .eyebrow,.row-heading,#navigation'));
  for(const route of ['movies','series','search']){
   await go({name:route});check(route+'-English-search',english('.search-form,.page-heading,.result-count'));
   click('search-sort');check(route+'-English-sort',english('.search-picker'));key(461);
   click('search-category');check(route+'-English-genres',english('.search-picker'));key(461);
  }
  await go({name:'settings'});click('setting-language-ar');check('main-Arabic-return',document.documentElement.dir==='rtl'&&document.querySelector('[data-focus=nav-home]').textContent==='الرئيسية'&&document.querySelector('.settings-heading h1').textContent==='الإعدادات');
  await activateMode('news');click('news-nav-settings');click('setting-language-en');check('news-settings-English',english('#navigation,.settings-heading,.settings-page,.remote-hint'));
  click('news-nav-home');check('news-home-English',english('#navigation,.news-heading,.row-heading'));
  click('news-nav-sources');check('news-sources-English',english('#content,#navigation'));
  click('news-nav-settings');click('setting-language-ar');check('news-Arabic-return',document.documentElement.dir==='rtl'&&document.querySelector('[data-focus=news-nav-home]').textContent==='الرئيسية'&&document.querySelector('.settings-heading h1').textContent==='الإعدادات');
  shield.setEnabled(true);shield.lastInput=Date.now()-121000;shield.tick();await wait(300);
  const mark=shield.rest.querySelector('.wordmark'),name=mark.querySelector('.wordmark-name'),by=mark.querySelector('.wordmark-credit');
  check('rest-wordmark-credit',!shield.rest.hidden&&name.textContent==='ROMANA'&&by.textContent==='by sics2002');
  check('rest-continuous-animation',getComputedStyle(mark).animationName==='romana-drift'&&parseFloat(getComputedStyle(mark).animationDuration)>=90);
  const x=mark.getBoundingClientRect().left;await wait(1200);const moved=mark.getBoundingClientRect().left-x;
  check('rest-moves-smoothly',Math.abs(moved)>.1,{delta:Math.round(moved*100)/100});
  const rr=by.getBoundingClientRect();check('rest-credit-within-screen',rr.right<=innerWidth&&rr.bottom<=innerHeight);
  shield.activity();shield.setEnabled(false);
  check('personal-records-preserved',personal.favorites===store.favorites().length&&personal.progress===store.progress().length);report.pass=true;
 }catch(e){report.pass=false;report.error=e.message}
 finally{shield.activity();store.saveSettings(saved);applyTheme();await activateMode('cinemana');report.finishedAt=new Date().toISOString();publish()}
}
