import {getLanguage,t} from './i18n.js';
export const itemTitle=item=>getLanguage()==='en'?(item.originalTitle||item.title):item.title;
export const itemDescription=item=>getLanguage()==='en'?(item.descriptionEn||''):(item.description||item.descriptionEn||'');
export const genresText=(genres,separator=' · ')=>(genres||[]).map(t).join(separator);
