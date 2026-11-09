import test from 'node:test';import assert from 'node:assert/strict';import {sortSearchItems,SORT_OPTIONS} from '../src/search-controls.js';
test('sort reorders all loaded pages, numeric ratings and dates, without mutating original',()=>{const a=[{id:1,rating:9,releaseDate:'2020-01-01',originalTitle:'Z'},{id:2,rating:7,releaseDate:'1990-01-01',originalTitle:'A'},{id:3,rating:10,releaseDate:'2010-01-01',originalTitle:'M'}];assert.deepEqual(sortSearchItems(a,'r_asc').map(x=>x.id),[2,3,1]);assert.deepEqual(sortSearchItems(a,'stars_desc').map(x=>x.id),[3,1,2]);assert.deepEqual(sortSearchItems(a,'title_asc').map(x=>x.id),[2,3,1]);assert.deepEqual(a.map(x=>x.id),[1,2,3]);assert.deepEqual(sortSearchItems(a,''),a)});
test('unavailable view-count ordering is explicitly disabled',()=>{assert.equal(SORT_OPTIONS.filter(x=>x[0].startsWith('views_')).every(x=>x[2]===true),true)});

import {SearchControls} from '../src/search-controls.js';
import {filterSecondGenre} from '../src/search-controls.js';
test('default second genre means no filtering, even when the All option has a label',()=>{
 const items=[{id:'1',genres:['دراما']},{id:'2',genres:['خيالي']},{id:'3',genres:[]}];
 const categories=[['','كل التصنيفات'],['67','خيالي']];
 assert.deepEqual(filterSecondGenre(items,'',categories),items);
 assert.deepEqual(filterSecondGenre(items,'67',categories).map(x=>x.id),['2']);
 assert.equal(items.length,3);
});
test('closed TV keyboard releases arrows, visible keyboard retains native arrows, Back leaves editing',t=>{const input={};globalThis.document={activeElement:input};t.after(()=>delete globalThis.document);const control=Object.create(SearchControls.prototype);Object.assign(control,{input,editing:true,keyboardVisible:true,form:{contains:()=>false},finish(){this.editing=false}});assert.equal(control.handleKey({key:'ArrowLeft'}),'native');assert.equal(control.editing,true);control.keyboardVisible=false;assert.equal(control.handleKey({key:'ArrowDown'}),true);assert.equal(control.editing,false);control.editing=true;control.keyboardVisible=true;assert.equal(control.handleKey({keyCode:461}),true);assert.equal(control.editing,false);});
