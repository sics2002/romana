export async function runSearchJourneyCheck({go,api}){
 const report={version:'1.1.0',profile:window.cinemanaProfile?.mode,checks:[],keyboardShown:0,keyboardHidden:0};
 const publish=()=>document.title='SEARCH_CHECK:'+JSON.stringify({...report,phase:report.checks[report.checks.length-1]?.name,checks:report.checks.map(({name,pass,...extra},id)=>({id,pass,...extra,...(!pass?{name}:{})}))});
 const check=(name,pass,extra={})=>{report.checks.push({name,pass,...extra});publish();if(!pass)throw Error(name)};
 const wait=async(fn,label,ms=180000)=>{const start=Date.now();while(!fn()){if(Date.now()-start>ms)throw Error('timeout:'+label);await new Promise(r=>setTimeout(r,80))}};
 const keyboard=e=>{if(e.detail?.visibility)report.keyboardShown++;else report.keyboardHidden++};document.addEventListener('keyboardStateChange',keyboard);
 const key=code=>{const el=document.activeElement,e=document.createEvent('Event');e.initEvent('keydown',true,true);e.keyCode=code;el.dispatchEvent(e);if(code===13&&!e.defaultPrevented)el.click();const up=document.createEvent('Event');up.initEvent('keyup',true,true);up.keyCode=code;(document.activeElement||el).dispatchEvent(up)};
 const focus=id=>document.querySelector('[data-focus="'+id+'"]').focus();
 const browse=api.browse;let delay=true;
 api.browse=async(...args)=>{const rows=await browse(...args);if(delay){delay=false;await new Promise(r=>setTimeout(r,650))}return rows};
 async function enterText(query,label){
  focus('search-entry');const shown=report.keyboardShown;key(13);
  const input=document.querySelector('input[type=search]');
  await wait(()=>report.keyboardShown>shown,'native-keyboard-open',8000);
  check(label+'-native-keyboard-open',!input.hidden&&document.activeElement===input);
  input.value=query;const e=document.createEvent('Event');e.initEvent('input',true,true);input.dispatchEvent(e);
  return input;
 }
 async function closeAndSearch(label,query,kind){
  const hidden=report.keyboardHidden;key(461);await wait(()=>report.keyboardHidden>hidden,'native-keyboard-close',8000);
  check(label+'-back-releases-input',document.activeElement.dataset.focus==='search-category'&&document.querySelector('input[type=search]').hidden);
  key(37);check(label+'-second-genre-reachable',document.activeElement.dataset.focus==='search-category2');
  key(37);check(label+'-sort-reachable',document.activeElement.dataset.focus==='search-sort');
  key(37);check(label+'-submit-reachable',document.activeElement.dataset.focus==='search-submit');key(13);
  await wait(()=>document.querySelectorAll('.search-results .poster-card').length>0&&document.activeElement.dataset.focus?.startsWith('result-'),'search-results');
  const cards=[...document.querySelectorAll('.search-results .poster-card')];
  check(label+'-real-name-results',cards.some(x=>x.querySelector('.card-title').textContent.toLowerCase().includes(query.toLowerCase())),{count:cards.length});
  check(label+'-correct-content-kind',cards.every(x=>x.dataset.kind===kind));
 }
 try{
  for(const [page,query,kind]of [['movies','Batman','movie'],['series','Breaking','series'],['search','Batman','movie']]){
   const pending=go({name:page});await wait(()=>document.querySelector('[data-focus="search-entry"]'),'form-ready');
   const input=await enterText(query,page);await pending;
   check(page+'-background-results-do-not-steal-input',document.activeElement===input&&!input.hidden&&input.value===query);
   key(37);check(page+'-keyboard-arrows-stay-native',document.activeElement===input);
   await closeAndSearch(page,query,kind);
  }
  focus('search-type');key(13);key(40);key(13);
  check('general-type-picker-ok',document.querySelector('[data-focus="search-type"]').textContent==='مسلسلات'&&!document.querySelector('.search-picker'));
  await enterText('Breaking','general-series');await closeAndSearch('general-series','Breaking','series');
  focus('search-sort');key(13);key(40);key(13);
  check('sort-picker-ok',!document.querySelector('.search-picker')&&document.activeElement.dataset.focus==='search-sort');
  const cards=()=>[...document.querySelectorAll('.search-results .poster-card')];
  async function images(label){
   const all=cards();let loaded=0,missing=0;
   for(let i=0;i<all.length;i+=4){
    const group=all.slice(i,i+4);focus(group[0].dataset.focus);
    report.imageProgress={label,done:i,total:all.length};publish();
    await wait(()=>group.every(c=>{const img=c.querySelector('img');return img.naturalWidth>0||['failed','missing'].includes(img.dataset.posterState)}),'poster-download',45000);
    report.imageProgress={label,done:Math.min(i+4,all.length),total:all.length};publish();
    loaded+=group.filter(c=>c.querySelector('img').naturalWidth>0).length;
    missing+=group.filter(c=>c.querySelector('img').dataset.posterState==='missing').length;
   }
   check(label+'-all-posters-loaded',loaded===all.length,{loaded,total:all.length,missing});
  }
  for(const [page,query]of [['series','game of thrones'],['movies','play'],['movies','fair'],['search','fair']]){
   await go({name:page,query,kind:page==='series'?'series':'movies'});
   await wait(()=>cards().length>0,'named-results');
   await images(page+'-'+query+'-initial');
   const original=cards().map(c=>c.dataset.itemId).join(',');
   focus('search-submit');key(13);await wait(()=>cards().length>0&&document.activeElement.dataset.focus?.startsWith('result-'),'red-submit');
   check(page+'-'+query+'-red-button-same-results',original===cards().map(c=>c.dataset.itemId).join(','));
   await images(page+'-'+query+'-red');
   const form=document.querySelector('.search-form'),e=document.createEvent('Event');e.initEvent('submit',true,true);form.dispatchEvent(e);
   await wait(()=>cards().length>0&&document.activeElement.dataset.focus?.startsWith('result-'),'enter-submit');
   check(page+'-'+query+'-enter-same-results',original===cards().map(c=>c.dataset.itemId).join(','));await images(page+'-'+query+'-enter');
  }
  await go({name:'search',query:'zzzzqzxv638491',kind:'movies'});
  check('zero-results-has-no-stale-cards',cards().length===0&&document.querySelector('[data-focus="search-more"]').hidden);
  await go({name:'search',kind:'movies',category:'67',category2:'77',sort:'stars_desc'});
  check('fantasy-romance-first-50',cards().length===50,{count:cards().length});
  const first=cards().map(c=>c.dataset.itemId),firstImage=cards()[0].querySelector('img');
  await images('two-genres-first-batch');
  focus('search-more');key(13);await wait(()=>cards().length>=100,'second-50');
  check('fantasy-romance-next-50',cards().length===100,{count:cards().length});
  check('pagination-no-duplicates',new Set(cards().map(c=>c.dataset.itemId)).size===100);
  check('pagination-keeps-existing-images',cards()[0].querySelector('img')===firstImage&&firstImage.naturalWidth>0);
  check('first-batch-order-preserved',first.join(',')===cards().slice(0,50).map(c=>c.dataset.itemId).join(','));
  const ratings=cards().map(c=>Number(c.querySelector('.card-rating')?.textContent.replace('★','').trim()||0));
  check('imdb-desc-across-both-batches',ratings.every((x,i)=>!i||x<=ratings[i-1]));
  check('both-genres-every-result',cards().every(c=>{const g=c.querySelector('.card-genres').textContent;return g.includes('خيالي')&&g.includes('رومانسي')}));
  await images('two-genres-second-batch');
  report.pass=true;
 }catch(e){report.pass=false;report.error=e.message}
 finally{api.browse=browse;document.removeEventListener('keyboardStateChange',keyboard);publish()}
}
