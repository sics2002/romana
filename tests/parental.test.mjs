import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeSkips,skipTarget} from '../src/parental.js';
import {TVPlayer} from '../src/player.js';
import {createStore} from '../src/storage.js';

test('source intervals validate and merge overlaps before use',()=>{
 assert.deepEqual(normalizeSkips({start:['30','10','18'],end:['40','20','25']}),[{start:10,end:25},{start:30,end:40}]);
 assert.deepEqual(normalizeSkips({start:[],end:[]}),[]);
 for(const data of [{},{start:[1],end:[]},{start:['bad'],end:[2]},{start:[3],end:[2]},{start:[null],end:[2]}])assert.throws(()=>normalizeSkips(data));
 const ranges=[{start:10,end:20}];assert.equal(skipTarget(ranges,9),null);assert.equal(skipTarget(ranges,9.7),20.75);assert.equal(skipTarget(ranges,15),20.75);assert.equal(skipTarget(ranges,20.75),null);
});

test('family skips before a marker and masks seek; default leaves playback intact',()=>{
 const p=Object.create(TVPlayer.prototype);Object.assign(p,{item:{id:'1'},settings:{parentalMode:'default'},skipsReady:true,skips:[{start:10,end:20}],root:{dataset:{},querySelector(){return this.mask||(this.mask={hidden:true})}},video:{currentTime:9.8,duration:100,style:{},muted:false}});
 assert.equal(p._guardFamily(),false);assert.equal(p.video.currentTime,9.8);
 p.settings.parentalMode='family';assert.equal(p._guardFamily(),true);assert.equal(p.video.currentTime,20.75);assert.equal(p.root.mask.hidden,false);assert.equal(p.video.muted,true);
 assert.equal(p._guardFamily(),false);p._revealFamily(true);assert.equal(p.video.muted,false);assert.equal(p.root.mask.hidden,true);
 p.video.muted=true;p.video.currentTime=15;p._guardFamily();p._revealFamily(true);assert.equal(p.video.muted,true);
});

test('failed family timing load stays paused and retains family preference for retry',async()=>{
 const p=Object.create(TVPlayer.prototype);let played=false,error=false;
 Object.assign(p,{item:{id:'1'},session:1,settings:{parentalMode:'default'},video:{paused:false,pause(){this.paused=true},play(){played=true}},_saveSettings(v){Object.assign(this.settings,v)},_loadSkips:async()=>{throw Error('offline')},_showError(){error=true}});
 await p._setParental('family');assert.equal(p.video.paused,true);assert.equal(played,false);assert.equal(error,true);assert.equal(p.settings.parentalMode,'family');
});

test('a late timing response cannot affect a newly opened item',async()=>{
 const p=Object.create(TVPlayer.prototype);let resolve;
 Object.assign(p,{session:1,item:{id:'1'},api:{skips:()=>new Promise(r=>resolve=r)},skips:[],skipsReady:false});
 const pending=p._loadSkips();p.session=2;p.item={id:'2'};resolve([{start:10,end:20}]);await pending;assert.equal(p.skipsReady,false);assert.deepEqual(p.skips,[]);
});

test('caption and parental preferences persist through validated storage',()=>{
 const map=new Map(),backend={getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v)};
 createStore(backend).saveSettings({subtitleSize:200,subtitleFont:'Verdana',subtitleEdge:'outline',subtitleBackground:false,parentalMode:'family'});
 const settings=createStore(backend).settings();assert.equal(settings.subtitleSize,200);assert.equal(settings.subtitleFont,'Verdana');assert.equal(settings.subtitleEdge,'outline');assert.equal(settings.parentalMode,'family');assert.equal(settings.subtitleBackground,false);
});

test('native keyframe landing does not cause a repeated seek loop',t=>{
 let now=1000;t.mock.method(Date,'now',()=>now);
 const p=Object.create(TVPlayer.prototype),mask={hidden:true};let time=9.8,seeks=0;
 Object.assign(p,{item:{id:'1'},settings:{parentalMode:'family'},skipsReady:true,skips:[{start:10,end:20}],root:{dataset:{},querySelector:()=>mask},video:{duration:100,muted:false,seeking:false,get currentTime(){return time},set currentTime(v){seeks++;time=v}}});
 p._guardFamily();assert.equal(seeks,1);assert.equal(mask.hidden,false);
 time=18;now=1300;p._guardFamily();p._guardFamily();assert.equal(seeks,1);assert.equal(mask.hidden,false);
 time=20.8;now=1600;p._guardFamily();assert.equal(mask.hidden,true);assert.equal(p.video.muted,false);
});
