import test from 'node:test';
import assert from 'node:assert/strict';
import {FocusManager} from '../src/focus.js';
test('direction geometry works with old DOMRect objects without x and y',()=>{
 const previous=globalThis.document,oldStyle=globalThis.getComputedStyle;
 function item(id,left,top){return {dataset:{focus:id},disabled:false,closest:()=>null,getClientRects:()=>[1],getBoundingClientRect:()=>({left,top,right:left+100,bottom:top+50,width:100,height:50}),focus(){globalThis.document.activeElement=this},scrollIntoView(){}}}
 const first=item('a',200,100),left=item('b',50,100),below=item('c',200,200),items=[first,left,below];
 const root={addEventListener(){},querySelectorAll(selector){return selector==='[data-focus]'?items:[]},querySelector(selector){return items.find(x=>selector.includes('"'+x.dataset.focus+'"'))}};
 globalThis.document={documentElement:{dataset:{}},activeElement:first};globalThis.getComputedStyle=()=>({visibility:'visible'});
 try{const manager=new FocusManager(root);manager.move('ArrowLeft',root);assert.equal(document.activeElement,left);document.activeElement=first;manager.move('ArrowDown',root);assert.equal(document.activeElement,below)}finally{globalThis.document=previous;globalThis.getComputedStyle=oldStyle}
});

test('returning focus to any hero action reveals the whole hero rather than only the button',()=>{
 const oldDoc=globalThis.document,oldStyle=globalThis.getComputedStyle;let buttonScroll=0,heroScroll;
 const hero={scrollIntoView(options){heroScroll=options}};
 const button={dataset:{focus:'hero-detail'},disabled:false,closest(selector){return selector==='.hero'?hero:null},getClientRects:()=>[1],focus(){},scrollIntoView(){buttonScroll++}};
 const root={addEventListener(){},querySelectorAll(){return []},querySelector(){return button}};
 globalThis.document=root;globalThis.getComputedStyle=()=>({visibility:'visible'});
 try{new FocusManager(root).focus('hero-detail');assert.equal(buttonScroll,0);assert.equal(heroScroll.block,'start');assert.equal(heroScroll.behavior,'smooth')}
 finally{globalThis.document=oldDoc;globalThis.getComputedStyle=oldStyle}
});
