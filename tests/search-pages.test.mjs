import test from 'node:test';import assert from 'node:assert/strict';import {collectSearchBatch} from '../src/search-pages.js';
const make=(start,n)=>Array.from({length:n},(_,i)=>({id:String(start+i),rating:10-(start+i)/1000}));
const state=()=>({items:[],page:0});
test('50 matches across sparse pages, next 50 preserve overflow and source order',async()=>{
 const s=state();let calls=0;
 const options={fetchPage:async p=>{calls++;return p<40?make(p*30,30):[]},filter:rows=>rows.filter(x=>Number(x.id)%7===0)};
 let a=await collectSearchBatch(s,options);assert.equal(a.items.length,50);assert.ok(calls>10);s.items.push(...a.items);
 let b=await collectSearchBatch(s,options);assert.equal(b.items.length,50);s.items.push(...b.items);
 assert.equal(new Set(s.items.map(x=>x.id)).size,100);assert.ok(s.items.every((x,i)=>!i||x.rating<=s.items[i-1].rating));
});
test('short name result terminates honestly and empty filter does not invent 50',async()=>{
 let s=state();let a=await collectSearchBatch(s,{fetchPage:async()=>make(0,10),pageSize:12});assert.equal(a.items.length,10);assert.equal(a.hasMore,false);
 s=state();a=await collectSearchBatch(s,{fetchPage:async p=>p<3?make(p*30,30):[],filter:()=>[]});assert.equal(a.items.length,0);assert.equal(a.hasMore,false);assert.equal(s.page,4);
});
test('duplicates and repeating source pages cannot loop or inflate results',async()=>{
 const s=state();const a=await collectSearchBatch(s,{fetchPage:async()=>make(0,30)});assert.equal(a.items.length,30);assert.equal(a.hasMore,false);assert.equal(s.page,2);
});
test('failure resumes at failing page with already collected matches retained',async()=>{
 const s=state();let fail=true;const opts={fetchPage:async p=>{if(p===1&&fail)throw Error('network');return make(p*30,30)}};
 await assert.rejects(collectSearchBatch(s,opts));assert.equal(s.page,1);assert.equal(s.buffer.length,30);fail=false;
 const a=await collectSearchBatch(s,opts);assert.equal(a.items.length,50);assert.equal(a.items[0].id,'0');assert.equal(a.items[49].id,'49');
});
test('cancelled response cannot commit into replacement search',async()=>{
 const s=state();let valid=true;const a=await collectSearchBatch(s,{fetchPage:async()=>{valid=false;return make(0,30)},valid:()=>valid});assert.equal(a,null);assert.equal(s.page,0);assert.equal(s.buffer.length,0);
});
