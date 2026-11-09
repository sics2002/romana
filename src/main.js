import {runLocaleBrandCheck} from './locale-brand-check.js';
import {createWordmark} from './wordmark.js';
import {itemTitle,itemDescription,genresText} from './localized-content.js';
import {runRomanaCheck} from './romana-check.js';
import {OledShield} from './oled-shield.js';
import {ActivationSequence} from './activation-sequence.js';
import {runHeroCheck} from './hero-check.js';
import {runRemotePlayerCheck} from './remote-player-check.js';
import {loadPoster,resetPosters} from './poster-loader.js';
import {collectSearchBatch} from './search-pages.js';
import {runUniversalCheck} from './universal-check.js';
import {runEncodingCheck} from './encoding-check.js';
import {runLayoutCheck} from './layout-check.js';
import {runLegacyCheck} from './legacy-check.js';
import {runReleaseCheck} from './release-check.js';
import {runPlayerCheck} from './player-check.js';
import {runModernCheck} from './modern-check.js';
import {runSearchCheck} from './search-check.js';
import {SearchControls,SORT_OPTIONS,sortSearchItems,filterSecondGenre} from './search-controls.js';
let searchRemote=null,heroTimer=null,advanceHero=null;
import {t,setLanguage,getLanguage,translateTree} from './i18n.js';
import {TERMS} from './terms.js';
import {runNewsCheck} from './news-check.js';
import {chooseMode} from './startup.js';
import {NewsApp} from './news-ui.js';
import {runTvCheck} from './tv-check.js';
import {api} from './api.js';import {store} from './storage.js';import {TVPlayer} from './player.js';import {FocusManager} from './focus.js';
const content=document.getElementById('content'),nav=document.getElementById('navigation'),overlay=document.getElementById('player-overlay'),focus=new FocusManager();
document.documentElement.setAttribute('data-romana-ready','');
const releaseVersion=typeof __ROMANA_VERSION__==='string'?__ROMANA_VERSION__:'1.0.0';
const shield=new OledShield(),activation=new ActivationSequence();
document.addEventListener('click',e=>{if(!e.target.closest?.('[data-focus=setting-language-ar]'))activation.reset()});
let newsApp=null;let route={name:'home'},history=[],generation=0,homeData=null,homeLoadedAt=0,homeLocale='',activeItem=null,toastTimer,playing=false,playReturnFocus='';
const create=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=t(text);return el};
const button=(text,id,fn,cls='')=>{const b=create('button',cls,text);b.type='button';b.dataset.focus=id;b.onclick=fn;return b};
function notice(text){const n=document.getElementById('toast');n.textContent=t(text);n.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>n.hidden=true,4500)}
function updatedClock(){document.getElementById('clock').textContent=new Intl.DateTimeFormat(getLanguage()==='en'?'en-GB':'ar-IQ',{hour:'numeric',minute:'2-digit'}).format(new Date())}updatedClock();setInterval(updatedClock,60000);
const player=new TVPlayer({root:overlay,api,store,onClose:()=>{window.legacySetPlayback?.(false);playing=false;document.getElementById('app').inert=false;focus.focus(playReturnFocus||(activeItem?'play-'+activeItem.id:focus.lastId));if(!store.persistent())notice('مساحة الحفظ غير متاحة؛ تقدّمك محفوظ لهذه الجلسة فقط.');},onFocus:id=>focus.focus(id,overlay),onNotice:notice});
function navigation(){nav.replaceChildren();for(const [name,label] of [['search','البحث'],['home','الرئيسية'],['movies','أفلام'],['series','مسلسلات'],['favorites','قائمتي'],['continue','متابعة'],['settings','إعدادات']]){const b=button(label,'nav-'+name,()=>go({name}),'nav-button'+(route.name===name?' active':''));b.setAttribute('aria-current',route.name===name?'page':'false');nav.append(b)}}
function loading(text='نجهّز لك ما يستحق المشاهدة…'){content.replaceChildren(create('div','loading-message',text));const skeleton=create('div','skeleton-row');for(let i=0;i<6;i++)skeleton.append(create('div','skeleton'));content.append(skeleton)}
function showError(error,retry){content.replaceChildren();const area=create('section','empty-state');area.append(create('span','eyebrow','تعذّر الاتصال'),create('h1','', 'المحتوى غير متاح الآن'),create('p','',error?.message||'تحقق من اتصال الشبكة ثم حاول مجدداً.'),button('إعادة المحاولة','retry',retry,'primary'));content.append(area);focus.focus('retry')}
function empty(title,message){const a=create('section','empty-state');a.append(create('span','eyebrow','مساحتك الخاصة'),create('h1','',title),create('p','',message),button('استكشف الإصدارات','explore',()=>go({name:'home'}),'primary'));content.append(a)}
function heading(title,subtitle){const h=create('div','page-heading');h.append(create('span','eyebrow','romana'),create('h1','',title));if(subtitle)h.append(create('p','muted',subtitle));content.append(h)}
function resumable(progress){return Boolean(progress&&progress.position>10&&(!progress.duration||progress.duration-progress.position>25))}
function continuing(){return store.progress().filter(resumable)}
function durationLabel(seconds){const value=Number(seconds);if(!Number.isFinite(value)||value<=0)return '';const minutes=Math.round(value/60);return Math.floor(minutes/60)+':'+String(minutes%60).padStart(2,'0')}
function meta(item){return [item.year,item.rating?'★ '+item.rating:'',durationLabel(item.duration)].filter(Boolean).join('  ·  ')}
const genreQueue=[],genreCache=new Map();let genreActive=0;
const genreObserver=new IntersectionObserver(entries=>{for(const e of entries){if(e.isIntersecting){genreObserver.unobserve(e.target);genreQueue.push(e.target);}}drainGenres()},{rootMargin:'150px'});
function drainGenres(){while(genreActive<(window.cinemanaLegacy?1:3)&&genreQueue.length){const element=genreQueue.shift();if(!element.isConnected)continue;const id=element.dataset.itemId;if(!id)continue;genreActive++;let request=genreCache.get(id);if(!request){request=api.details(id).then(x=>x.genres||[]).catch(()=>[]);genreCache.set(id,request);if(genreCache.size>200)genreCache.delete(genreCache.keys().next().value)}request.then(genres=>{if(element.isConnected)element.querySelector('.card-genres').textContent=genresText(genres)}).finally(()=>{genreActive--;drainGenres()})}}
function card(item,group,index,{progress=false,episode=false}={}){const b=button('',group+'-'+item.id+'-'+index,()=>go({name:'details',id:item.id}), 'poster-card');b.dataset.itemId=item.id;b.dataset.kind=item.kind;b.setAttribute('aria-label',episode?t('الحلقة')+' '+item.episode+' · '+itemTitle(item):itemTitle(item));const art=create('div','poster-art');const img=create('img');img.loading='lazy';img.decoding='async';img.alt='';loadPoster(img,item.poster||'',art);art.append(img,create('span','card-action','عرض التفاصيل'));if(item.rating)art.append(create('span','card-rating','★ '+item.rating));if(progress&&item.duration){const bar=create('span','watch-progress');bar.style.setProperty('--watched',Math.min(100,item.position/item.duration*100)+'%');art.append(bar)}b.append(art,create('span','card-title',episode?t('الحلقة')+' '+item.episode:itemTitle(item)),create('span','card-meta',episode?itemTitle(item):meta(item)),create('span','card-genres',genresText(item.genres)));if(!item.genres?.length)genreObserver.observe(b);return b}
function row(title,items,id,opts={}){if(!items?.length)return;const section=create('section','content-row'),head=create('div','row-heading');head.append(create('h2','',title));if(opts.more)head.append(button('عرض الكل ←','more-'+id,opts.more,'text-button'));section.append(head);const rail=create('div','card-rail');rail.dataset.focusGroup=id;(window.cinemanaLegacy?items.slice(0,12):items).forEach((x,i)=>rail.append(card(x,id,i,opts)));section.append(rail);content.append(section);return rail}
function hero(items){
 let index=0;const h=create('section','hero');const bg=create('img','hero-backdrop');bg.alt='';bg.decoding='async';h.append(bg);
 const copy=create('div','hero-copy'),title=create('h1'),metadata=create('p','hero-meta'),description=create('p','hero-description');
 copy.append(create('span','eyebrow','جديد في رومانا'),title,metadata,description);
 const actions=create('div','hero-actions');actions.dataset.focusGroup='hero';
 const detail=button('▶  اكتشف وشاهد','hero-detail',()=>go({name:'details',id:items[index].id}),'primary');
 const favorite=button('','hero-favorite',()=>{store.toggleFavorite(items[index]);paint()},'secondary');actions.append(detail,favorite);copy.append(actions);
 const count=create('span','hero-count');const arrows=create('div','hero-arrows');
 arrows.append(button('','hero-next',()=>advanceHero(1),'hero-arrow'),button('','hero-prev',()=>advanceHero(-1),'hero-arrow'));
 arrows.children[0].setAttribute('aria-label',t('البوستر التالي'));arrows.children[1].setAttribute('aria-label',t('البوستر السابق'));
 h.append(copy,count,arrows);content.append(h);
 function paint(){const item=items[index];bg.src=item.backdrop||item.poster||'';title.textContent=itemTitle(item);metadata.textContent=meta(item);description.textContent=itemDescription(item)||t('اكتشف القصة، وتابعها على شاشتك.');favorite.textContent=t(store.isFavorite(item.id)?'✓  في قائمتي':'＋  قائمتي');count.textContent=(index+1)+' / '+items.length;h.dataset.slide=String(index);}
 function schedule(){clearTimeout(heroTimer);heroTimer=setTimeout(()=>{if(!playing&&!document.hidden&&window.scrollY<innerHeight/3)advanceHero(1);else schedule()},window.cinemanaLegacy?10000:6500);}
 advanceHero=delta=>{index=(index+delta+items.length)%items.length;paint();schedule()};paint();if(items.length>1)schedule();
}
async function home(token){
 const language=getLanguage();const data=homeData&&homeLocale===language&&Date.now()-homeLoadedAt<180000?homeData:await api.home(language);if(data!==homeData)homeLoadedAt=Date.now();homeData=data;homeLocale=language;if(token!==generation)return;
 content.replaceChildren();if(data.banners?.[0])hero(data.banners);const progress=continuing();if(progress.length)row('أكمل من حيث توقفت',progress,'resume',{progress:true,more:()=>go({name:'continue'})});
 let count=0,more;
 const addRows=()=>{const end=window.cinemanaLegacy?Math.min(count+5,data.rows.length):data.rows.length;for(;count<end;count++){const r=data.rows[count];row(r.title,r.items,'row-'+count,{more:r.hasMore||(window.cinemanaLegacy&&r.items.length>12)?()=>go(['movies','series','new'].includes(r.id)?{name:r.id}:{name:'group',groupId:r.id,title:r.title}):null})}if(more){more.hidden=count>=data.rows.length;content.append(more)}};
 addRows();if(window.cinemanaLegacy&&count<data.rows.length){more=button('المزيد من الأقسام','home-more-sections',()=>{const index=count;addRows();focus.focus(document.querySelector('[data-focus-group="row-'+index+'"] [data-focus]')?.dataset.focus)},'secondary home-more-sections');content.append(more)}
 if(!data.rows.length)empty('لا يوجد محتوى','حاول تحديث الصفحة بعد قليل.');focus.focus('hero-detail');
}
async function catalog(token) {
  if(['movies','series'].includes(route.name))return search(token,route.name);
  const viewRoute = route;
  const names = { movies: 'أفلام لكل مزاج', series: 'قصص تستحق المتابعة', new: 'الإصدارات الجديدة', group: route.title };
  content.replaceChildren();
  heading(names[route.name], 'اختر عنواناً لعرض التفاصيل والمشاهدة');
  const state = viewRoute.catalogState || { items: [], page: 0, hasMore: true };
  const grid = create('div', 'poster-grid');
  grid.dataset.focusGroup = 'catalog';
  content.append(grid);
  const more = button('تحميل المزيد', 'catalog-more', () => load(), 'secondary load-more');
  content.append(more);
  function paint() {
    grid.replaceChildren();
    state.items.forEach((item, index) => grid.append(card(item, 'catalog', index)));
    more.hidden = !state.hasMore;
  }
  async function load() {
    if (more.disabled || !state.hasMore) return;
    more.disabled = true;
    try {
      const next = viewRoute.name === 'group'
        ? await api.group(viewRoute.groupId, state.page)
        : await api.catalog(viewRoute.name, state.page);
      if (token !== generation) return;
      const seen = new Set(state.items.map(item => item.id));
      const fresh = next.filter(item => !seen.has(item.id));
      const firstIndex = state.items.length;
      fresh.forEach((item, index) => grid.append(card(item, 'catalog', firstIndex + index)));
      state.items.push(...fresh);
      state.page++;
      state.hasMore = viewRoute.name !== 'new' && next.length >= 24 && fresh.length > 0;
      viewRoute.catalogState = state;
      more.hidden = !state.hasMore;
      if (fresh.length) focus.focus('catalog-' + fresh[0].id + '-' + firstIndex);
      else if (state.items.length) focus.focus('catalog-' + state.items[state.items.length - 1].id + '-' + (state.items.length - 1));
      else { empty('لا توجد نتائج', 'جرّب قسماً آخر.'); focus.focus('explore'); }
    } catch (error) {
      if (token !== generation) return;
      more.textContent=t('إعادة المحاولة');
      notice(error.message);
    } finally { more.disabled = false; }
  }
  if (state.page) { paint(); if (state.items.length) focus.focus('catalog-' + state.items[0].id + '-0'); }
  else await load();
}
function personal(name){content.replaceChildren();const items=name==='favorites'?store.favorites():continuing();if(!items.length){empty(name==='favorites'?'قائمتك تبدأ باختيار':'كل حكاية لها بداية',name==='favorites'?'أضف الأفلام والمسلسلات التي تحبها لتجدها هنا.':'ابدأ المشاهدة وسنحفظ موضعك تلقائياً.');focus.focus('explore');return}heading(name==='favorites'?'قائمتي':'متابعة المشاهدة',name==='favorites'?'اختياراتك، دائماً قريبة':'ارجع إلى اللحظة التي توقفت عندها');const grid=create('div','poster-grid');grid.dataset.focusGroup='personal';items.forEach((x,i)=>grid.append(card(x,'personal',i,{progress:name==='continue'})));content.append(grid);focus.focus('personal-'+items[0].id+'-0')}
async function search(token, scope = '') {
  const viewRoute = route;
  content.replaceChildren();
  heading(scope==='movies'?'أفلام':scope==='series'?'مسلسلات':'ما الذي تود مشاهدته؟',scope==='movies'?'ابحث في الأفلام':scope==='series'?'ابحث في المسلسلات':'ابحث باسم فيلم أو مسلسل');
  const form = create('form', 'search-form');
  form.dataset.focusGroup = 'search';
  const input = create('input', 'search-input');
  input.type = 'search'; input.placeholder = 'اكتب اسم الفيلم أو المسلسل';
  input.setAttribute('aria-label', 'اسم الفيلم أو المسلسل');
  input.dataset.focus = 'search-input'; input.autocomplete = 'off'; input.value = viewRoute.query || '';
  input.hidden=true;
  const entry=button(input.value||'اكتب اسم الفيلم أو المسلسل','search-entry',()=>{},'search-input search-entry');
  let selectedKind=scope||viewRoute.kind||'movies';
  let selectedCategory2=viewRoute.category2||'';
  let selectedCategory=viewRoute.category||'',selectedSort=viewRoute.sort||'',categories=[['','كل التصنيفات']],categoriesReady;
  const genres=button(viewRoute.categoryTitle||'كل التصنيفات','search-category',async()=>{await categoriesReady;if(token!==generation)return;searchRemote.openPicker('search-category','التصنيف',categories,selectedCategory,(id,label)=>{selectedCategory=id;viewRoute.categoryTitle=label;genres.textContent=t(label)})},'genre-select');
  const genres2=button(viewRoute.category2Title||'التصنيف الثاني: الكل','search-category2',async()=>{await categoriesReady;if(token!==generation)return;searchRemote.openPicker('search-category2','التصنيف الثاني',categories,selectedCategory2,(id,label)=>{selectedCategory2=id;viewRoute.category2Title=id?label:'التصنيف الثاني: الكل';genres2.textContent=t(viewRoute.category2Title)})},'genre-select');
  const sortButton=button(SORT_OPTIONS.find(x=>x[0]===selectedSort)?.[1]||'الترتيب الافتراضي','search-sort',()=>searchRemote.openPicker('search-sort','الترتيب والفرز',SORT_OPTIONS.map(x=>[x[0],x[1],!!input.value.trim()&&x[0].startsWith('views_')]),selectedSort,(id,label)=>{selectedSort=id;sortButton.textContent=t(label)},'بدون اسم: ترتيب كامل من سينمانا. مع الاسم: ترتيب النتائج المحمّلة؛ فرز المشاهدات غير متاح.'),'genre-select');
  const submit = button('ابحث', 'search-submit', () => {}, 'primary');
  const typeButton=button(selectedKind==='movies'?'أفلام':'مسلسلات','search-type',()=>searchRemote.openPicker('search-type','نوع المحتوى',[['movies','أفلام'],['series','مسلسلات']],selectedKind,(id,label)=>{selectedKind=id;typeButton.textContent=t(label)}),'genre-select');
  submit.type='button';submit.onclick=()=>searchRemote.requestSearch();form.append(entry,input);if(!scope)form.append(typeButton);form.append(genres,genres2,sortButton,submit);content.append(form);
  searchRemote=new SearchControls({form,input,entry,focus});
  const results = create('section', 'search-results');
  const message = create('p', 'result-count');
  const grid = create('div', 'poster-grid'); grid.dataset.focusGroup = 'results';
  const more = button('تحميل المزيد', 'search-more', () => load({focusResults:true}), 'secondary load-more');
  results.append(message, grid, more); content.append(results);
  let request = 0;
  let loadingPage = false,userSubmitted=false;
  let state = viewRoute.searchState || { items: [], page: 0, hasMore: false, query: viewRoute.query || '', category: viewRoute.category || '',category2:viewRoute.category2||'',sort:viewRoute.sort||'',kind:selectedKind };
  function paint() {
    grid.replaceChildren();
    state.items.forEach((item, index) => grid.append(card(item, 'result', index)));
    message.textContent=t(state.items.length?'نتائج البحث · '+state.items.length:state.page?'لم نجد نتائج لهذا البحث':'اكتب اسماً أو اختر تصنيفاً.');
    more.hidden = !state.hasMore;
  }
  async function load({focusResults=false}={}) {
    if (loadingPage || !state.hasMore) return;
    const current = ++request;
    const currentState = state;
    loadingPage = true; more.disabled = true;
    if (!state.items.length) message.textContent = t('جارٍ البحث…');
    try {
      const serverOrder=!currentState.query;
      const batch=await collectSearchBatch(currentState,{
        fetchPage:page=>serverOrder?api.browse(currentState.kind,page,currentState.category||currentState.category2,currentState.sort||'desc'):api.search(currentState.query,page,currentState.category||currentState.category2,currentState.sort,currentState.kind),
        filter:items=>filterSecondGenre(items,currentState.category&&currentState.category!==currentState.category2?currentState.category2:'',categories),
        pageSize:serverOrder?30:12,
        valid:()=>token===generation&&current===request,
        onProgress:()=>{if(token===generation&&current===request)message.textContent=t('جارٍ جمع النتائج المطابقة… '+(currentState.items.length+(currentState.buffer?.length||0)))}
      });
      if(!batch||token!==generation||current!==request)return;
      const fresh=batch.items;
      currentState.items.push(...fresh);
      if(!serverOrder)currentState.items=sortSearchItems(currentState.items,currentState.sort);
      // Keep existing image elements and their active downloads when loading another batch.
      const existing=new Map([...grid.children].map(el=>[el.dataset.itemId,el]));
      currentState.items.forEach((item,index)=>{const el=existing.get(item.id)||card(item,'result',index);el.dataset.focus='result-'+item.id+'-'+index;grid.append(el)});
      currentState.hasMore=batch.hasMore;
      viewRoute.searchState = currentState;
      message.textContent=t(currentState.items.length?'نتائج البحث · '+currentState.items.length:'لم نجد نتائج لهذا البحث');
      if(currentState.category2)message.textContent+=t(' · يجمع التصنيفين معاً')+(currentState.hasMore?t(' · تحميل المزيد يفحص بقية النتائج'):'');
      more.textContent = t('تحميل المزيد'); more.hidden = !currentState.hasMore;
      if (focusResults&&!searchRemote.editing&&!searchRemote.modal&&fresh.length) focus.focus('result-' + fresh[0].id + '-' + currentState.items.findIndex(x=>x.id===fresh[0].id));
      else if (focusResults&&!searchRemote.editing&&!searchRemote.modal&&currentState.items.length) focus.focus('result-' + currentState.items[currentState.items.length - 1].id + '-' + (currentState.items.length - 1));
    } catch (error) {
      if (token !== generation || current !== request) return;
      message.textContent = t(error.message); more.textContent=t('إعادة المحاولة'); more.hidden = false;
    } finally {
      if (current === request) { loadingPage = false; submit.disabled = false; more.disabled = false; }
    }
  }
  form.onsubmit = async event => {
    event.preventDefault();userSubmitted=true;
    searchRemote.finish(false);viewRoute.query = input.value.trim(); viewRoute.category = selectedCategory;viewRoute.category2=selectedCategory2;viewRoute.sort=input.value.trim()&&selectedSort.startsWith('views_')?'':selectedSort;viewRoute.kind=selectedKind;

    request++; loadingPage = false;
    state = { items: [], page: 0, hasMore: true, query: viewRoute.query, category: viewRoute.category,category2:viewRoute.category2,sort:viewRoute.sort,kind:selectedKind };
    viewRoute.searchState = state; paint(); await categoriesReady;if(token===generation)await load({focusResults:true});
  };
  categoriesReady=api.categories().then(items => {
    if (token !== generation) return;
    categories=[['','كل التصنيفات'],...items.map(category=>[category.id,category.title])];
  }).catch(() => {});
  paint(); focus.focus('search-entry');
  await categoriesReady; if(token!==generation)return;
  if (!userSubmitted&&!state.page && (scope || state.query || state.category || state.category2 || state.sort)) { state.hasMore = true; await load(); }
}
async function details(token){const item=await api.details(route.id);if(token!==generation)return;activeItem=item;content.replaceChildren();const banner=homeData?.banners?.find(x=>x.id===item.id);const section=create('section','detail-page');if(banner?.backdrop){const bg=create('img','detail-backdrop');bg.src=banner.backdrop;bg.alt='';section.append(bg)}const artwork=create('img','detail-poster');artwork.src=item.poster||'';artwork.alt=itemTitle(item);section.append(artwork);const text=create('div','detail-copy');text.append(create('span','eyebrow',item.kind==='series'?'مسلسل · سينمانا':'فيلم · سينمانا'),create('h1','',itemTitle(item)),create('p','original-title',item.originalTitle!==item.title?item.originalTitle:''),create('p','hero-meta',meta(item)),create('p','genre-line',genresText(item.genres,'  ·  ')),create('p','detail-description',itemDescription(item)||'لا يتوفر وصف لهذا العنوان.'));const actions=create('div','detail-actions');actions.dataset.focusGroup='detail-actions';const p=store.getProgress(item.id);const canResume=resumable(p);const play=button(canResume?'▶  استئناف المشاهدة':'▶  شاهد الآن','play-'+item.id,()=>startPlayback(item),'primary');actions.append(play);if(canResume)actions.append(button('من البداية','restart-'+item.id,()=>startPlayback(item,true),'secondary'));actions.append(button(store.isFavorite(item.id)?'✓  في قائمتي':'＋  أضف لقائمتي','favorite-'+item.id,e=>{store.toggleFavorite(item);e.currentTarget.textContent=t(store.isFavorite(item.id)?'✓  في قائمتي':'＋  أضف لقائمتي');notice(store.isFavorite(item.id)?'أُضيف إلى قائمتك':'أُزيل من قائمتك')},'secondary'),button('رجوع','detail-back',back,'text-button'));text.insertBefore(actions,text.querySelector('.hero-meta'));section.append(text);content.append(section);focus.focus('play-'+item.id);
  if(item.kind==='series'){const holder=create('section','episodes-section');holder.append(create('h2','','المواسم والحلقات'),create('p','muted','جارٍ تحميل الحلقات…'));content.append(holder);try{const episodes=await api.episodes(item.id);if(token!==generation)return;holder.replaceChildren(create('h2','','المواسم والحلقات'));if(!episodes.length)holder.append(create('p','muted','لا تتوفر حلقات لهذا العنوان.'));const seasons=[...new Set(episodes.map(x=>x.season||1))];const tabs=create('div','season-tabs');tabs.dataset.focusGroup='seasons';const rail=create('div','episode-grid');rail.dataset.focusGroup='episodes';function select(season){rail.replaceChildren();tabs.querySelectorAll('button').forEach(b=>b.classList.toggle('selected',b.dataset.season===String(season)));episodes.filter(x=>(x.season||1)===season).forEach((episode,i)=>{const b=button('','episode-'+episode.id,()=>startPlayback(episode),'episode-card');b.append(create('span','episode-number',String(episode.episode||i+1)),create('span','episode-title',episode.title),create('span','muted',durationLabel(episode.duration)));const progress=store.getProgress(episode.id);if(resumable(progress))b.append(create('span','episode-resume','متابعة'));rail.append(b)})}for(const s of seasons){const b=button('الموسم '+s,'season-'+s,()=>select(s),'season-button');b.dataset.season=s;tabs.append(b)}holder.append(tabs,rail);select(item.season||seasons[0]);if(episodes.length)play.onclick=()=>startPlayback(episodes.find(x=>x.id===item.id)||episodes[0]);}catch(e){holder.replaceChildren(create('p','muted',e.message),button('إعادة تحميل الحلقات','episodes-retry',()=>render(),'secondary'))}}
  try{const related=await api.related(item.parentId||item.id,item.kind);if(token===generation)row(item.kind==='series'?'مسلسلات مقترحة':'أفلام مقترحة',related.filter(x=>x.kind===item.kind),'detail-related')}catch(_){if(token===generation)content.append(create('p','recommendation-note','تعذّر تحميل الاقتراحات حالياً.'))}
}
async function startPlayback(item,fromStart=false){playReturnFocus=focus.lastId;const progress=store.getProgress(item.id);if(progress?.duration&&progress.duration-progress.position<=25)fromStart=true;playing=true;window.legacySetPlayback?.(true);document.getElementById('app').inert=true;try{await player.open(item,{fromStart})}catch(e){window.legacySetPlayback?.(false);playing=false;document.getElementById('app').inert=false;notice(e.message);focus.focus(playReturnFocus||('play-'+activeItem?.id))}}
function go(next){if(playing)return;if(next.name!=='settings')activation.reset();history.push({route:{...route},focus:focus.lastId,scroll:window.scrollY});if(history.length>30)history.shift();route=next;window.scrollTo(0,0);return render()}
// PalmSystem fallback matches LG webOSTVjs-1.2.13.zip platformBack implementation.
function back(){if(playing){player.close();return}if(history.length){const prev=history.pop();route=prev.route;render().then(token=>{if(token!==generation)return;window.scrollTo(0,prev.scroll);focus.focus(prev.focus)})}else if(route.name!=='home'){route={name:'home'};render()}else if(window.webOS?.platformBack)window.webOS.platformBack();else if(window.PalmSystem?.platformBack)window.PalmSystem.platformBack();else notice('أنت في الصفحة الرئيسية')}
async function render(){if(window.cinemanaLegacy)content.scrollTop=0;resetPosters();genreObserver.disconnect();genreQueue.length=0;clearTimeout(heroTimer);advanceHero=null;document.documentElement.dataset.page=route.name;searchRemote?.destroy();searchRemote=null;const token=++generation;navigation();loading();try{if(route.name==='home')await home(token);else if(['movies','series','new','group'].includes(route.name))await catalog(token);else if(['favorites','continue'].includes(route.name))personal(route.name);else if(route.name==='search')await search(token);else if(route.name==='details')await details(token);else if(route.name==='settings')settingsPage();else if(route.name==='terms')termsPage();else if(route.name==='login')loginPage()}catch(e){if(token===generation)showError(e,()=>{homeData=null;render()})}translateTree(document.getElementById('app'));return token}
document.addEventListener('keydown',e=>{if(e.repeat&&(e.keyCode===13||e.key==='Enter')&&e.target.dataset?.focus==='setting-language-ar'){e.preventDefault();return}if(document.getElementById('intro')){e.preventDefault();return}const searchHandled=searchRemote?.handleKey(e);if(searchHandled){if(searchHandled!=='native')e.preventDefault();return}if(e.target.dataset?.focus==='terms-content'&&['ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();if(e.key==='ArrowDown'&&e.target.scrollTop+e.target.clientHeight>=e.target.scrollHeight-2)focus.focus('terms-back');else e.target.scrollBy({top:e.key==='ArrowDown'?180:-180,behavior:'smooth'});return}if(newsApp&&document.documentElement.dataset.page==='terms'&&(e.keyCode===461||['Escape','Backspace'].includes(e.key))){e.preventDefault();newsApp.render();focus.focus('settings-terms');return}if(newsApp?.handleKey(e)){e.preventDefault();return}if(playing&&player.handleKey(e)){e.preventDefault();return}const code=e.keyCode||e.which;const key=({37:'ArrowLeft',38:'ArrowUp',39:'ArrowRight',40:'ArrowDown'})[code]||e.key;if(code===461||e.key==='Escape'||(e.key==='Backspace'&&!['INPUT','TEXTAREA'].includes(e.target.tagName))){e.preventDefault();back();return}if(!playing&&advanceHero&&e.target.closest?.('.hero')&&['ArrowLeft','ArrowRight'].includes(key)){e.preventDefault();advanceHero(key==='ArrowRight'?1:-1);return}if(!playing&&e.target.dataset?.focus==='hero-detail'&&key==='ArrowUp'){e.preventDefault();focus.focus('hero-favorite');return}if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(key)){if(e.target.tagName==='SELECT')return;if(e.target.tagName==='INPUT'&&['ArrowLeft','ArrowRight'].includes(key))return;e.preventDefault();focus.move(key,playing?overlay:document)}if((e.key==='Enter'||code===13)&&e.target===document.body){e.preventDefault();focus.focus('',playing?overlay:document)}},true);

function updateFooter(){const footer=document.querySelector('.remote-hint');footer.replaceChildren();for(const label of ['الأسهم للتنقل','OK اختيار','↩ رجوع'])footer.append(create('span','',label));const badge=create('span','independent');badge.append(createWordmark(document,'by sics'));footer.append(badge)}
function applyTheme(){const settings=store.settings();shield.setEnabled(settings.oledShield);document.documentElement.dataset.theme=settings.theme||'dark';document.documentElement.dataset.fontSize=settings.fontSize||'medium';setLanguage(settings.uiLanguage);updateFooter();updatedClock();shield.rest.setAttribute('aria-label',t('شاشة سكون'));document.documentElement.lang=getLanguage();document.documentElement.dir=getLanguage()==='en'?'ltr':'rtl';translateTree(document.getElementById('app'));translateTree(overlay);}
function settingsPage(){
 document.documentElement.dataset.page='settings';content.replaceChildren();const head=create('div','settings-heading');head.append(create('h1','','الإعدادات'),create('p','muted','خصّص تجربة المشاهدة'));content.append(head);
 const section=create('section','settings-page settings-modern');
 const settings=store.settings();
 const group=(title,id,values,current,change)=>{const area=create('section','setting-row');area.dataset.setting=id;area.append(create('h2','',title));const choices=create('div','setting-choices');choices.dataset.focusGroup=id;for(const [value,label]of values){const b=button(label,id+'-'+value,()=>{if(change(value)===false)return;settingsPage();focus.focus(id+'-'+value)},'setting-choice');b.setAttribute('aria-pressed',String(value===current));choices.append(b)}area.append(choices);section.append(area);return area};
 group('الوضع المظلم','setting-theme',[['dark','تفعيل'],['light','إغلاق']],settings.theme,value=>{store.saveSettings({theme:value});applyTheme()});
 group('حجم الخط','setting-font',[['small','صغير'],['medium','متوسط'],['large','كبير']],settings.fontSize,value=>{store.saveSettings({fontSize:value});applyTheme()});
 group('الرقابة الأبوية','setting-parental',[['default','افتراضي'],['family','عائلي']],settings.parentalMode,value=>store.saveSettings({parentalMode:value}));
 section.lastElementChild.append(create('p','muted','يتخطى عائلي المقاطع المحددة لدى سينمانا فقط؛ قد لا تتوفر توقيتات لكل عنوان.'));
 const quality=create('section','setting-row');quality.append(create('h2','','دقة الفيديو'),create('p','setting-value','تلقائي'),create('p','muted','تُختار الجودة المناسبة تلقائياً عند بدء الفيديو.'));section.append(quality);
 group('اللغة','setting-language',[['ar','العربية'],['en','الإنجليزية']],settings.uiLanguage,value=>{store.saveSettings({uiLanguage:value});applyTheme();if(activation.press(value)){void activateMode(newsApp?'cinemana':'news');return false}if(newsApp)newsApp.navigation();else navigation();updateFooter()});
 group('درع OLED','setting-oled',[[true,'تفعيل'],[false,'إغلاق']],settings.oledShield,value=>{store.saveSettings({oledShield:value});applyTheme()});
 section.lastElementChild.append(create('p','muted','إزاحة خفيفة للواجهة وسكون بعد الخمول؛ حماية مساعدة وليست ضماناً لمنع الاحتراق.'));
 const contact=create('section','setting-row contact-row');contact.append(create('h2','','اتصل بنا'),create('p','contact-email','sics2002@gmail.com'));
 const links=create('div','contact-links');
 const site=button('','contact-website',()=>openExternal('https://www.sics2002.com/'),'social-contact');
 site.setAttribute('aria-label','www.sics2002.com');
 const globe=document.createElementNS('http://www.w3.org/2000/svg','svg');
 globe.setAttribute('viewBox','0 0 24 24');globe.setAttribute('aria-hidden','true');globe.setAttribute('class','social-glyph website-globe');
 const outline=document.createElementNS(globe.namespaceURI,'path');
 outline.setAttribute('d','M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm-9 9h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z');
 globe.appendChild(outline);site.appendChild(globe);links.appendChild(site);
 const social=[['instagram','◎','إنستغرام','sics2002','https://www.instagram.com/sics2002/'],['facebook','f','فيسبوك','sics2002','https://www.facebook.com/sics2002'],['youtube','▶','يوتيوب','sics2002','https://www.youtube.com/@sics2002'],['tiktok','♪','تيك توك','sics2002','https://www.tiktok.com/@sics2002'],['x','𝕏','إكس','sics2000','https://x.com/sics2000']];
 for(const [id,icon,label,handle,url]of social){const link=button('','contact-'+id,()=>openExternal(url),'social-contact');link.setAttribute('aria-label',t(label)+' @'+handle);link.append(create('span','social-glyph',icon),create('span','social-handle','@'+handle));links.append(link)}
 contact.append(links);section.prepend(contact);section.append(button('شروط الاستخدام','settings-terms',()=>newsApp?termsPage():go({name:'terms'}),'terms-link'));
 section.append(create('small','settings-version','ROMANA '+releaseVersion));
 content.append(section);focus.focus('contact-instagram');window.scrollTo(0,0);translateTree(content);
}
function termsPage(){document.documentElement.dataset.page='terms';content.replaceChildren();heading('شروط الاستخدام');const area=create('section','terms-page');area.tabIndex=0;area.dataset.focus='terms-content';area.setAttribute('aria-label',t('شروط الاستخدام'));for(const [title,body]of TERMS[getLanguage()]){const section=create('section');section.append(create('h2','',title),create('p','',body));area.append(section)}area.append(button('رجوع','terms-back',()=>newsApp?newsApp.render():back(),'secondary'));content.append(area);focus.focus('terms-content');window.scrollTo(0,0)}
function openExternal(url){if(window.PalmServiceBridge){const bridge=new window.PalmServiceBridge();window.cinemanaExternalRequest=bridge;bridge.onservicecallback=raw=>{try{if(JSON.parse(raw).returnValue===false)notice(t('تعذّر فتح الرابط.'))}catch(_){}};bridge.call('luna://com.webos.applicationManager/launch',JSON.stringify({id:'com.webos.app.browser',params:{target:url}}))}else window.open(url,'_blank','noopener,noreferrer')}
function loginPage(){
 content.replaceChildren();heading('تسجيل الدخول','حساب سينمانا');
 const section=create('section','settings-page');
 section.append(create('p','muted','تسجيل الدخول يتم في صفحة سينمانا الرسمية. الحساب في المتصفح لا يرتبط تلقائياً بهذا التطبيق؛ المشاهدة والقائمة والتقدّم هنا متاحة على جهازك دون حساب.'));
 section.append(button('فتح صفحة تسجيل الدخول الرسمية','official-login',()=>{
  const url='https://cinemana.shabakaty.cc/login';
  if(window.PalmSystem){
   try {const request=new window.PalmServiceBridge();request.onservicecallback=raw=>{try{if(JSON.parse(raw).returnValue===false)notice('تعذّر فتح المتصفح. افتح cinemana.shabakaty.cc/login على هاتفك.')}catch(_){}};request.call('luna://com.webos.applicationManager/launch',JSON.stringify({id:'com.webos.app.browser',params:{target:url}}));}
   catch(_){notice('افتح cinemana.shabakaty.cc/login في متصفح التلفزيون أو هاتفك.')}
  } else window.open(url,'_blank','noopener,noreferrer');
 },'primary'));
 content.append(section);focus.focus('official-login');
}
let resolveIntro;const introReady=new Promise(resolve=>resolveIntro=resolve);
const intro=document.getElementById('intro'),introStarted=performance.now();let introDone=false;
if(window.cinemanaLegacy&&intro){const r=intro.querySelector('.intro-lockup').getBoundingClientRect();window.legacyIntroGeometry={x:r.left+r.width/2,y:r.top+r.height/2};}
const introDuration=intro?getComputedStyle(intro).animationDuration:'';
const dismissIntro=()=>{if(introDone)return;introDone=true;const imageReady=!!intro?.querySelector('img')?.naturalWidth;intro?.remove();resolveIntro();try{if((typeof __ROMANA_DIAGNOSTICS__==='undefined'||__ROMANA_DIAGNOSTICS__)&&JSON.parse(window.PalmSystem?.launchParams||'{}').introSelfTest===true){const elapsed=Math.round(performance.now()-introStarted);document.title='INTRO_CHECK:'+JSON.stringify({version:'0.5.2',imageReady,duration:introDuration,elapsed,removed:!document.getElementById('intro'),mode:document.documentElement.dataset.mode,pass:imageReady&&elapsed<=6500&&!document.getElementById('intro')});}}catch(_){}};
intro?.addEventListener('animationend',e=>{if(e.target===intro)dismissIntro()});setTimeout(dismissIntro,6200);
applyTheme();
document.querySelector('.brand').onclick=e=>{e.preventDefault();if(newsApp){newsApp.route='home';newsApp.selected=null;newsApp.render()}else go({name:'home'})};boot().then(()=>{if(!(typeof __ROMANA_DIAGNOSTICS__==='undefined'||__ROMANA_DIAGNOSTICS__))return;try{if(JSON.parse(window.PalmSystem?.launchParams||'{}').localeBrandSelfTest===true)void runLocaleBrandCheck({go,activateMode,applyTheme,shield,store});if(JSON.parse(window.PalmSystem?.launchParams||'{}').romanaSelfTest===true)void runRomanaCheck({go,activateMode,activation,shield,applyTheme,store,player,api,startPlayback});if(JSON.parse(window.PalmSystem?.launchParams||'{}').heroSelfTest===true)void runHeroCheck({go,focus});if(JSON.parse(window.PalmSystem?.launchParams||'{}').remotePlayerSelfTest===true)void runRemotePlayerCheck({go,api,player,store,startPlayback});if(JSON.parse(window.PalmSystem?.launchParams||'{}').universalSelfTest===true)void runUniversalCheck({go,api,player,store,startPlayback});if(JSON.parse(window.PalmSystem?.launchParams||'{}').encodingSelfTest===true)void runEncodingCheck({go,api});if(JSON.parse(window.PalmSystem?.launchParams||'{}').layoutSelfTest===true)void runLayoutCheck({go,api,player,store,startPlayback});if(JSON.parse(window.PalmSystem?.launchParams||'{}').legacySelfTest===true)void runLegacyCheck({go});if(JSON.parse(window.PalmSystem?.launchParams||'{}').releaseSelfTest===true)void runReleaseCheck({player,go,api,store,startPlayback});if(JSON.parse(window.PalmSystem?.launchParams||'{}').familySelfTest===true)void runPlayerCheck({player,go,api,store,startPlayback,familyOnly:true});if(JSON.parse(window.PalmSystem?.launchParams||'{}').playerSelfTest===true)void runPlayerCheck({player,go,api,store,startPlayback});if(JSON.parse(window.PalmSystem?.launchParams||'{}').modernSelfTest===true)void runModernCheck({player,go,api,store});if(JSON.parse(window.PalmSystem?.launchParams||'{}').searchSelfTest===true)void runSearchCheck({go,api});if(JSON.parse(window.PalmSystem?.launchParams||'{}').cinemanaSelfTest===true)void runTvCheck({player,go,api,store})}catch(_){}}).catch(error=>showError(error,()=>location.reload()));


async function activateMode(mode){
 activation.reset();if(playing)player.close();searchRemote?.destroy();searchRemote=null;clearTimeout(heroTimer);advanceHero=null;
 generation++;newsApp?.destroy();newsApp=null;history=[];route={name:'home'};document.documentElement.dataset.mode=mode;
 applyTheme();document.title='ROMANA';
 if(mode==='news')newsApp=new NewsApp({content,nav,focus,notice,onSettings:settingsPage});
 else await render();
}

async function boot(){
 const started=performance.now();document.documentElement.dataset.mode='starting';
 content.replaceChildren();const shell=create('div','boot-mark');shell.append(create('span','boot-dot'));content.append(shell);
 let newsCheck=false;if((typeof __ROMANA_DIAGNOSTICS__==='undefined'||__ROMANA_DIAGNOSTICS__))try{newsCheck=JSON.parse(window.PalmSystem?.launchParams||'{}').newsSelfTest===true}catch(_){}
 const decision=await chooseMode(newsCheck?{fetchImpl:async()=>{throw Error('developer simulated network failure')}}:{});
 document.documentElement.dataset.mode=decision.mode;document.documentElement.dataset.startupMs=String(Math.round(performance.now()-started));
 await introReady;
 await store.ready();applyTheme();
 if(store.recovered())notice('تمت استعادة بياناتك من النسخة الاحتياطية المحلية.');
 if(decision.mode==='news'){translateTree(document.getElementById('app'));newsApp=new NewsApp({content,nav,focus,notice,onSettings:settingsPage});if(newsCheck)void runNewsCheck(newsApp);return}
 homeData={banners:decision.items.slice(0,8),rows:[{id:'new',title:'الإصدارات الجديدة',items:decision.items,hasMore:true}]};homeLoadedAt=Date.now();homeLocale=getLanguage();
 await render();const token=generation;const initialFocus=focus.lastId;
 const requestedLanguage=getLanguage();api.home(requestedLanguage).then(data=>{if(getLanguage()!==requestedLanguage)return;homeData=data;homeLocale=requestedLanguage;homeLoadedAt=Date.now();if(route.name==='home'&&generation===token&&!playing){const id=focus.lastId,y=window.pageYOffset;home(token).then(()=>{if(generation!==token||playing)return;focus.focus(id);if(!document.activeElement?.closest('.hero'))window.scrollTo(0,y)})}}).catch(()=>{});
}

document.addEventListener('keyup',event=>player.handleKeyUp(event),true);
document.addEventListener('contextmenu',event=>{if(playing){event.preventDefault();player.handleKey({key:'Back',preventDefault(){}})}},true);
let translating=false;new MutationObserver(()=>{if(translating||getLanguage()!=='en'||document.documentElement.dataset.mode!=='cinemana')return;translating=true;queueMicrotask(()=>{translateTree(document.getElementById('app'));translateTree(overlay);translating=false})}).observe(document.getElementById('app'),{subtree:true,childList:true,characterData:true});
