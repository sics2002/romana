import {t} from './i18n.js';
export const SORT_OPTIONS=[['','الترتيب الافتراضي'],['desc','أحدث الإضافات'],['asc','أقدم الإضافات'],['r_asc','سنة الإصدار الأقدم'],['r_desc','سنة الإصدار الأحدث'],['title_asc','ترتيب تصاعدي للأبجدية'],['title_desc','ترتيب تنازلي للأبجدية'],['views_asc','عدد المشاهدات تصاعدي',true],['views_desc','عدد المشاهدات تنازلي',true],['rating_asc','تصنيف الفئة العمرية تصاعدي'],['rating_desc','تصنيف الفئة العمرية تنازلي'],['stars_asc','تصنيف IMDb تصاعدي'],['stars_desc','تصنيف IMDb تنازلي']];
export function sortSearchItems(items,sort){
 const fields={asc:'addedAt',desc:'addedAt',r_asc:'releaseDate',r_desc:'releaseDate',title_asc:'originalTitle',title_desc:'originalTitle',rating_asc:'parentalRating',rating_desc:'parentalRating',stars_asc:'rating',stars_desc:'rating'};
 const field=fields[sort];if(!field)return [...items];const direction=sort==='desc'||sort.endsWith('_desc')?-1:1;
 return [...items].sort((a,b)=>{const x=a[field],y=b[field];if(x==null||x==='')return y==null||y===''?0:1;if(y==null||y==='')return -1;return direction*(typeof x==='number'?x-y:String(x).localeCompare(String(y),'en',{numeric:true,sensitivity:'base'}))});
}
export function filterSecondGenre(items,id,categories){
 if(!id)return items;
 const label=categories.find(pair=>pair[0]===id)?.[1];
 return label?items.filter(item=>item.genres?.includes(label)):items;
}
export class SearchControls{
 constructor({form,input,entry,focus}){Object.assign(this,{form,input,entry,focus});this.keyboardVisible=false;this.editing=false;this.closedAt=0;this.editSession=0;
 this.keyboard=e=>{this.keyboardVisible=!!e.detail?.visibility;if(this.keyboardVisible)this.keyboardSeen=true;form.dataset.keyboardVisible=String(this.keyboardVisible);clearTimeout(this.keyboardTimer);if(!this.keyboardVisible&&this.keyboardSeen){this.closedAt=Date.now();const session=this.editSession;this.keyboardTimer=setTimeout(()=>{if(this.editing&&session===this.editSession&&!this.keyboardVisible)this.finish(!this.modal)},60)}};document.addEventListener('keyboardStateChange',this.keyboard);
 this.beginEditing=()=>{clearTimeout(this.openTimer);if(this.editing&&document.activeElement===input)return;clearTimeout(this.keyboardTimer);clearTimeout(this.blurTimer);this.pendingOpen=false;this.editSession++;this.keyboardSeen=false;this.editing=true;entry.hidden=true;input.hidden=false;input.focus()};
 entry.onclick=this.beginEditing;
 // Finish the remote OK gesture before focusing the native input. Otherwise its
 // release/default click can reach the newly opened IME and immediately dismiss it.
 this.release=e=>{if(this.pendingOpen&&(e.keyCode===13||e.which===13||e.key==='Enter')){this.pendingOpen=false;clearTimeout(this.openTimer);this.openTimer=setTimeout(()=>this.beginEditing(),0)}};
 document.addEventListener('keyup',this.release);
 input.onblur=e=>{clearTimeout(this.blurTimer);const target=e?.relatedTarget;if(target&&form.contains(target)&&target!==input){if(this.editing)this.finish(false);return}this.blurTimer=setTimeout(()=>{if(this.editing&&!this.keyboardVisible&&document.activeElement!==input)this.finish(document.activeElement===document.body)},180)};
 }
 finish(returnFocus=true){clearTimeout(this.openTimer);this.pendingOpen=false;clearTimeout(this.keyboardTimer);clearTimeout(this.blurTimer);this.editing=false;this.keyboardVisible=false;this.form.dataset.keyboardVisible='false';this.input.blur?.();this.input.hidden=true;this.entry.hidden=false;this.entry.textContent=this.input.value||t('اكتب اسم الفيلم أو المسلسل');if(returnFocus)this.focus.focus('search-category');}
 requestSearch(){this.finish(false);const event=document.createEvent('Event');event.initEvent('submit',true,true);this.form.dispatchEvent(event);}
 openPicker(owner,title,options,value,change,note=''){
 this.closePicker(false);this.owner=owner;const modal=document.createElement('section');modal.className='search-picker';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-label',t(title));const h=document.createElement('h2');h.textContent=t(title);modal.append(h);
 if(note){const p=document.createElement('p');p.textContent=t(note);modal.append(p)}
 const list=document.createElement('div');list.className='search-picker-list';modal.append(list);for(const [id,label,disabled]of options){const b=document.createElement('button');b.type='button';b.textContent=(value===id?'✓ ':'')+t(label);b.disabled=!!disabled;b.dataset.focus='picker-'+id;b.setAttribute('aria-pressed',String(value===id));b.onclick=()=>{change(id,label);this.closePicker()};list.append(b)}
 this.modal=modal;document.body.append(modal);this.focus.focus('picker-'+value,modal);
 }
 closePicker(restore=true){if(!this.modal)return;this.modal.remove();this.modal=null;if(restore)this.focus.focus(this.owner)}
 handleKey(e){const key=({461:'Back',37:'ArrowLeft',38:'ArrowUp',39:'ArrowRight',40:'ArrowDown',13:'Enter',27:'Escape'})[e.keyCode||e.which]||e.key||'';const back=['Back','Escape','BrowserBack'].includes(key);
 if(document.activeElement===this.entry&&key==='Enter'){if(!e.repeat)this.pendingOpen=true;return true}
 if(this.modal){if(back){this.closePicker();return true}if(key==='Enter'){if(document.activeElement?.tagName==='BUTTON'&&!document.activeElement.disabled)document.activeElement.click();return true}if(key==='ArrowUp'||key==='ArrowDown'){const a=[...this.modal.querySelectorAll('button:not(:disabled)')],i=a.indexOf(document.activeElement),next=a[Math.max(0,Math.min(a.length-1,i+(key==='ArrowDown'?1:-1)))];if(next)this.focus.focus(next.dataset.focus,this.modal);return true}if(key==='ArrowLeft'||key==='ArrowRight')return true;return 'native'}
 if(this.editing&&document.activeElement===this.input){if(back){this.finish();return true}if(key.startsWith('Arrow')){if(this.keyboardVisible)return 'native';this.finish();return true}if(key==='Enter'&&!this.keyboardVisible){this.requestSearch();return true}return 'native'}
 if(this.form.contains(document.activeElement)&&key==='Enter'&&document.activeElement.tagName==='BUTTON'){document.activeElement.click();return true}
 if(this.form.contains(document.activeElement)&&key.startsWith('Arrow')){const a=[...this.form.querySelectorAll('[data-focus]')].filter(x=>!x.hidden&&!x.disabled);const i=a.indexOf(document.activeElement);let delta=key==='ArrowDown'?1:key==='ArrowUp'?-1:(key==='ArrowLeft'?1:-1)*(document.documentElement.dir==='ltr'?-1:1);if(a[i+delta]){this.focus.focus(a[i+delta].dataset.focus);return true}}
 return false;
 }
 destroy(){clearTimeout(this.openTimer);this.pendingOpen=false;clearTimeout(this.keyboardTimer);clearTimeout(this.blurTimer);document.removeEventListener('keyboardStateChange',this.keyboard);document.removeEventListener('keyup',this.release);this.input.onblur=null;this.closePicker(false)}
}
