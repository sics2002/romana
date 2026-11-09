import test from 'node:test';import assert from 'node:assert/strict';import {shieldState} from '../src/oled-shield.js';import {ActivationSequence} from '../src/activation-sequence.js';import {createStore} from '../src/storage.js';
test('shield shifts only by bounded whole pixels at one-minute intervals',()=>{
 const values=[];for(let minute=0;minute<18;minute++){const s=shieldState({enabled:true,elapsed:minute*60000,playing:true});values.push(s.x+','+s.y);assert.ok(Number.isInteger(s.x)&&Math.abs(s.x)<=2&&Number.isInteger(s.y)&&Math.abs(s.y)<=2);assert.equal(s.rest,false)}
 assert.equal(new Set(values).size,9);assert.deepEqual(shieldState({enabled:true,elapsed:59999}),{x:0,y:0,rest:false});
});
test('idle rest starts at two minutes except during playing video; disabled or hidden resets offsets',()=>{
 assert.equal(shieldState({enabled:true,idleFor:119999}).rest,false);assert.equal(shieldState({enabled:true,idleFor:120000}).rest,true);
 assert.equal(shieldState({enabled:true,idleFor:999999,playing:true}).rest,false);
 for(const p of [{enabled:false},{enabled:true,hidden:true}])assert.deepEqual(shieldState({...p,elapsed:61000,idleFor:999999}),{x:0,y:0,rest:false});
});
test('shield preference is validated and survives store recreation',()=>{
 const values=new Map(),backend={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};const store=createStore(backend);assert.equal(store.settings().oledShield,false);
 store.saveSettings({oledShield:true});assert.equal(createStore(backend).settings().oledShield,true);store.saveSettings({oledShield:'true'});assert.equal(store.settings().oledShield,false);
});
test('activation sequence fires once and supports a second round without persistent flags',()=>{
 let at=10000;const sequence=new ActivationSequence(()=>at);for(let i=0;i<5;i++)assert.equal(sequence.press('ar'),false);assert.equal(sequence.press('ar'),true);
 for(let i=0;i<5;i++)assert.equal(sequence.press('ar'),false);assert.equal(sequence.press('ar'),true);
});
test('language change, delay and explicit reset break incomplete activation sequences',()=>{
 let at=10000;const sequence=new ActivationSequence(()=>at);for(let i=0;i<5;i++)sequence.press('ar');sequence.press('en');assert.equal(sequence.press('ar'),false);
 at+=3000;assert.equal(sequence.press('ar'),false);assert.equal(sequence.count,1);sequence.reset();assert.equal(sequence.count,0);
});

import {OledShield} from '../src/oled-shield.js';
function shieldHarness(){
 let at=10000,next=0;const timers=new Map();
 const node=()=>({children:[],style:{setProperty(){}},dataset:{},setAttribute(){},append(x){this.children.push(x)},get firstElementChild(){return this.children[0]},remove(){}});
 const doc={createElement:node,body:node(),documentElement:node(),hidden:false,addEventListener(){},removeEventListener(){},querySelector(){return null}};
 const win={setInterval(fn){timers.set(++next,fn);return next},clearInterval(id){timers.delete(id)}};
 return {timers,shield:new OledShield({doc,win,now:()=>at}),advance:ms=>at+=ms};
}
test('disabled shield has no background interval, and theme changes do not restart movement',()=>{
 const {shield,timers,advance}=shieldHarness();assert.equal(timers.size,0);shield.setEnabled(false);assert.equal(timers.size,0);shield.setEnabled(true);assert.equal(timers.size,1);
 const start=shield.started;advance(1000);shield.setEnabled(true);assert.equal(shield.started,start);assert.equal(timers.size,1);shield.setEnabled(false);assert.equal(timers.size,0);shield.destroy();
});
test('pointer wake consumes the following click so it cannot activate a hidden button',()=>{
 const {shield}=shieldHarness();shield.setEnabled(true);shield.rest.hidden=false;let prevented=0;
 for(const type of ['mousedown','click'])shield.input({type,preventDefault(){prevented++},stopImmediatePropagation(){}});
 assert.equal(prevented,2);assert.equal(shield.rest.hidden,true);shield.destroy();
});

test('OK wake also consumes the generated click after key release',()=>{
 const {shield}=shieldHarness();shield.setEnabled(true);shield.rest.hidden=false;let prevented=0;
 const event=type=>({type,keyCode:13,preventDefault(){prevented++},stopImmediatePropagation(){}});
 shield.input(event('keydown'));shield.release(event('keyup'));shield.input(event('click'));assert.equal(prevented,3);assert.equal(shield.rest.hidden,true);shield.destroy();
});

test('returning to the foreground resets inactivity instead of immediately masking the app',()=>{
 const {shield,advance}=shieldHarness();shield.setEnabled(true);advance(180000);shield.doc.hidden=true;shield.visibility();assert.equal(shield.rest.hidden,true);shield.doc.hidden=false;shield.visibility();assert.equal(shield.rest.hidden,true);assert.equal(shield.lastInput,shield.now());shield.destroy();
});

test('directional wake does not discard an immediately following intentional click',()=>{
 const {shield}=shieldHarness();shield.setEnabled(true);shield.rest.hidden=false;let prevented=0;
 shield.input({type:'keydown',keyCode:38,preventDefault(){prevented++},stopImmediatePropagation(){}});
 shield.release({keyCode:38,preventDefault(){},stopImmediatePropagation(){}});
 shield.input({type:'click',preventDefault(){prevented++},stopImmediatePropagation(){}});assert.equal(prevented,1);shield.destroy();
});
