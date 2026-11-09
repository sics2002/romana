import {t,getLanguage,translateTree} from './i18n.js';
import { getFeed, getSeries, loadNewsCache, saveNewsCache, publicUrl } from './news-data.js';
const ROWS = [
  ['film','أخبار الأفلام'], ['television','أخبار المسلسلات والتلفزيون'],
  ['netflix','أحدث إعلانات نتفليكس'], ['warner','أحدث إعلانات وارنر برذرز'],
  ['series','مسلسلات تُعرض اليوم'], ['deadline','أخبار هوليوود · ديدلاين'], ['hollywood','هوليوود ريبورتر'],
];
const el = (tag, cls, text) => { const node=document.createElement(tag); node.className=cls||''; if(text!==undefined)node.textContent=t(text);return node; };
export class NewsApp {
  constructor({content,nav,focus,notice,onSettings}) {
    Object.assign(this,{content,nav,focus,notice,onSettings}); this.rows=loadNewsCache(); this.route='home'; this.backFocus='';
    this.navigation(); this.render(); this.refresh();
  }
  button(text,id,handler,cls='secondary') { const b=el('button',cls,text);b.type='button';b.dataset.focus=id;b.onclick=handler;return b; }
  navigation(){
    this.nav.replaceChildren();
    for(const [id,title] of [['home','الرئيسية'],['film','أخبار الأفلام'],['television','أخبار المسلسلات'],['trailers','الإعلانات'],['series','المسلسلات'],['sources','المصادر'],['settings','إعدادات']]) {
      this.nav.append(this.button(title,'news-nav-'+id,()=>{this.route=id;this.selected=null;this.render();if(id!=='settings')this.focus.focus('news-nav-'+id)},'nav-button'+(this.route===id?' active':'')));
    }
  }
  async refresh(){
    if(this.refreshing||this.disposed)return;
    this.refreshing=true;this.finished=false;
    let success=0;
    await Promise.allSettled(ROWS.map(async([id,title])=>{
      try {
        const items=await(id==='series'?getSeries():getFeed(id));
        if(this.disposed||!items.length)return;
        const row={id,title,items,updatedAt:Date.now()};
        const index=this.rows.findIndex(r=>r.id===id);if(index>=0)this.rows[index]=row;else this.rows.push(row);
        this.rows.sort((a,b)=>ROWS.findIndex(r=>r[0]===a.id)-ROWS.findIndex(r=>r[0]===b.id));success++;
        saveNewsCache(this.rows);
        if(!this.selected&&!['sources','settings'].includes(this.route))this.render(true);
      }catch(_){/* Independent feeds do not block one another. Keep the last valid edition. */}
    }));
    this.refreshing=false;if(this.disposed)return;this.finished=true;if(this.selected||['settings','sources'].includes(this.route))return;
    if(!success&&!this.rows.length){this.content.replaceChildren(el('div','page-heading','المحتوى غير متاح الآن'),this.button('إعادة المحاولة','news-retry',()=>this.refresh()));this.focus.focus('news-retry')}
    else if(!this.selected&&!['sources','settings'].includes(this.route))this.render(true);
  }
  destroy(){this.disposed=true;this.browserRequest?.cancel?.()}
  render(keepFocus=false){
    if(this.disposed)return;document.documentElement.dataset.page=this.route==='settings'?'settings':'news';
    const focused=document.activeElement?.dataset.focus,scroll=window.scrollY;
    this.navigation();this.content.replaceChildren();
    if(this.route==='settings'){this.onSettings?.();return}
    const header=el('section','news-heading');header.append(el('span','eyebrow','عالم السينما والمسلسلات'),el('h1','',this.route==='home'?'قصص جديدة، وأخبار تستحق المتابعة':this.route==='trailers'?'الإعلانات الرسمية':this.route==='sources'?'المصادر':ROWS.find(row=>row[0]===this.route)?.[1]||'الأخبار'));
    this.content.append(header);
    if(this.route==='sources'){
      const copy=el('section','settings-page');copy.append(el('p','muted','العناوين والصور وروابط الأخبار من خلاصات الناشرين؛ اقرأ المقال الكامل لدى مصدره. الإعلانات من قناتي نتفليكس ووارنر برذرز الرسميتين على YouTube. النصوص الإخبارية بلغة ناشرها.'));
      copy.append(el('p','muted','كتالوج المسلسلات: TVmaze، بترخيص CC BY-SA. حقوق الصور لأصحابها. هذا التطبيق مستقل وغير تابع للناشرين.'));
      copy.append(this.button('TVmaze · المصدر والترخيص','news-tvmaze',()=>this.openExternal('https://www.tvmaze.com/api')));
      this.content.append(copy);return;
    }
    const rows=this.rows.filter(row=>this.route==='home'||row.id===this.route||(this.route==='trailers'&&['netflix','warner'].includes(row.id)));
    if(!rows.length){
      if(this.finished)this.content.append(el('p','page-heading muted','لا يوجد محتوى متاح في هذا القسم حالياً.'),this.button('تحديث','news-refresh',()=>this.refresh()));
      else{const shell=el('div','news-placeholder');shell.setAttribute('aria-busy','true');for(let i=0;i<5;i++)shell.append(el('div','skeleton'));this.content.append(shell);}
    }
    for(const row of rows){
      const section=el('section','content-row');const heading=el('div','row-heading');heading.append(el('h2','',row.title));
      const stamp=el('span','news-date',new Intl.DateTimeFormat(getLanguage()==='en'?'en-GB':'ar-IQ',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(row.updatedAt||Date.now()));heading.append(stamp);section.append(heading);
      const rail=el('div','card-rail news-rail');rail.dataset.focusGroup='news-'+row.id;
      for(const item of row.items){const b=this.button('','news-card-'+item.id,()=>this.details(item),'poster-card news-card'+(row.id==='series'?' series-poster':''));
        const art=el('div','poster-art');if(item.image){const image=el('img');image.src=item.image;image.alt='';image.loading='lazy';image.onerror=()=>{image.hidden=true;art.classList.add('no-image')};art.append(image)}else art.append(el('span','news-source-art',item.source));
        b.append(art,el('span','card-title',item.title),el('span','card-meta',item.source));rail.append(b);
      }section.append(rail);this.content.append(section);
    }
    if(keepFocus){window.scrollTo(0,scroll);if(focused)this.focus.focus(focused);}
  }
  details(item){
    this.backFocus=this.focus.lastId;this.backScroll=window.scrollY;this.selected=item;this.content.replaceChildren();window.scrollTo(0,0);
    const section=el('section','detail-page news-detail');
    if(item.image){const image=el('img','detail-poster');image.src=item.image;image.alt='';section.append(image)}
    const copy=el('div','detail-copy');copy.append(el('span','eyebrow',item.source),el('h1','',item.title));
    const actions=el('div','detail-actions');actions.dataset.focusGroup='news-details';
    if(item.youtubeId)actions.append(this.button('▶ مشاهدة الإعلان الرسمي','news-trailer',()=>this.openExternal(item.url),'primary'));
    else actions.append(this.button(item.kind==='series'?'تفاصيل المسلسل لدى المصدر':'قراءة الخبر لدى المصدر','news-original',()=>this.openExternal(item.url),'primary'));
    actions.append(this.button('رجوع','news-back',()=>this.back()));copy.append(actions);
    if(item.date){const date=new Date(item.date);if(!Number.isNaN(date.valueOf()))copy.append(el('p','muted',new Intl.DateTimeFormat(getLanguage()==='en'?'en-GB':'ar-IQ',{year:'numeric',month:'long',day:'numeric'}).format(date)))}
    if(item.description)copy.append(el('p','detail-description',item.description));
    if(item.kind==='series'){
      const title=item.title.toLowerCase();
      const match=this.rows.flatMap(row=>row.items).find(entry=>entry.youtubeId&&entry.title.toLowerCase().split('|')[0].trim()===title);
      if(match)copy.append(this.button('▶ الإعلان الرسمي','news-series-trailer',()=>this.openExternal(match.url)));
      else copy.append(el('p','muted','لم يتوفر إعلان رسمي مرتبط بهذا المسلسل في المصادر الحالية.'));
    }
    if(item.youtubeId)copy.append(el('p','muted','يُفتح الإعلان في YouTube عبر متصفح التلفزيون. اضغط رجوع للعودة إلى التطبيق.'));
    section.append(copy);this.content.append(section);this.focus.focus(item.youtubeId?'news-trailer':'news-original');
  }
  openExternal(value){
    const url=publicUrl(value);if(!url)return;
    if(window.PalmServiceBridge){
      const bridge=new window.PalmServiceBridge();this.browserRequest=bridge;
      bridge.onservicecallback=raw=>{try{if(JSON.parse(raw).returnValue===false)this.notice(t('تعذّر فتح المصدر. حاول مرة أخرى.'))}catch(_){}};
      bridge.call('luna://com.webos.applicationManager/launch',JSON.stringify({id:'com.webos.app.browser',params:{target:url}}));
    }else window.open(url,'_blank','noopener,noreferrer');
  }
  back(){if(this.selected){this.selected=null;this.render();window.scrollTo(0,this.backScroll||0);this.focus.focus(this.backFocus)}else if(this.route!=='home'){this.route='home';this.render();this.focus.focus('news-nav-home')}else if(window.PalmSystem?.platformBack)window.PalmSystem.platformBack();}
  handleKey(event){if(event.keyCode===461||['Escape','Backspace'].includes(event.key)){this.back();return true;}return false;}
}
