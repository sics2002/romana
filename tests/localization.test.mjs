import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {parse} from 'acorn';import {setLanguage,t} from '../src/i18n.js';import{itemTitle,itemDescription,genresText}from '../src/localized-content.js';
test('all static Arabic UI strings in both interfaces, player and API errors have English coverage',()=>{
 setLanguage('en');try{for(const file of ['main','player','news-ui','search-controls','api','oled-shield']){
 const ast=parse(fs.readFileSync(new URL('../src/'+file+'.js',import.meta.url),'utf8'),{ecmaVersion:'latest',sourceType:'module'}),missing=new Set();
 function walk(n){if(!n||typeof n!=='object')return;if(n.type==='Literal'&&typeof n.value==='string'&&/[\u0600-\u06ff]/.test(t(n.value)))missing.add(n.value);for(const v of Object.values(n))if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==='object')walk(v)}walk(ast);assert.deepEqual([...missing],[],file)
 }}finally{setLanguage('ar')}
});
test('dynamic counts, combined genres and source errors translate without Arabic fragments',()=>{
 setLanguage('en');try{for(const value of ['نتائج البحث · 50','جارٍ جمع النتائج المطابقة… 12','تعذر تحميل المحتوى (503).','اكشن · دراما','الموسم 1 · الحلقة 5'])assert.equal(/[\u0600-\u06ff]/.test(t(value)),false,value)}finally{setLanguage('ar')}
});
test('localized metadata uses available English content without inventing translations',()=>{
 const item={title:'عنوان عربي',originalTitle:'English title',description:'وصف عربي',descriptionEn:'English synopsis'};
 setLanguage('en');assert.equal(itemTitle(item),'English title');assert.equal(itemDescription(item),'English synopsis');assert.equal(genresText(['اكشن','دراما']),'Action · Drama');assert.equal(itemDescription({...item,descriptionEn:''}),'');setLanguage('ar');assert.equal(itemTitle(item),'عنوان عربي');assert.equal(itemDescription(item),'وصف عربي');
});

test('static accessibility labels in the app shell have English translations',()=>{
 const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');setLanguage('en');try{for(const match of html.matchAll(/aria-label="([^"]+)"/g))assert.equal(/[\u0600-\u06ff]/.test(t(match[1])),false,match[1])}finally{setLanguage('ar')}
});
