import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseMode } from '../src/startup.js';
import { publicUrl } from '../src/news-data.js';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { readFeed } = require('../news-service/feeds.cjs');
const valid = [{ nb: '123', ar_title:'فيلم', imgObjUrl:'https://cinemana.shabakaty.cc/image.jpg' }];
test('valid service data selects full app and reuses the probe result', async()=>{
 let options;const result=await chooseMode({fetchImpl:async(url,init)=>{options=init;return {ok:true,json:async()=>valid}}});
 assert.equal(result.mode,'cinemana');assert.equal(result.items[0].id,'123');assert.equal(options.credentials,'omit');assert.equal(options.cache,'no-store');
});
test('blocked, invalid, empty and disconnected service all select news',async()=>{
 for(const fetchImpl of [async()=>({ok:false,status:403}),async()=>({ok:true,json:async()=>({login:true})}),async()=>({ok:true,json:async()=>[]}),async()=>{throw Error('offline')}])assert.equal((await chooseMode({fetchImpl})).mode,'news');
});
test('hard deadline works even if transport ignores abort; late success cannot change mode',async()=>{
 let finish,signal;const result=await chooseMode({timeoutMs:20,fetchImpl:(_,init)=>{signal=init.signal;return new Promise(resolve=>finish=resolve)}});
 assert.equal(result.mode,'news');assert.equal(signal.aborted,true);finish({ok:true,json:async()=>valid});await new Promise(resolve=>setTimeout(resolve,0));assert.equal(result.mode,'news');
});
test('untrusted outbound feed and image destinations are rejected',()=>{
 for(const value of ['http://youtube.com/watch?v=a','https://youtube.com.evil.test/','https://name:password@youtube.com/','javascript:alert(1)','https://127.0.0.1/'])assert.equal(publicUrl(value),'');
 assert.equal(publicUrl('https://i.ytimg.com/vi/test/hqdefault.jpg'),'https://i.ytimg.com/vi/test/hqdefault.jpg');
});
test('native service accepts fixed feed identifiers only, never arbitrary URLs',async()=>{
 for(const id of ['https://127.0.0.1/','__proto__','constructor','../film'])await assert.rejects(readFeed(id),/Unknown feed/);
});
