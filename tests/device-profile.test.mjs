import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {selectProfile} from '../src/device-profile.js';
const features={grid:true,variables:true,aspectRatio:true,flex:true};
test('LG published engine generations select compatible or modern without model-name guesses',()=>{
 for(const chrome of [38,53,68,79,87,94,108,120,132]){
  const p=selectProfile({userAgent:'Web0S WebAppManager Chrome/'+chrome+'.0',features:chrome>=88?features:{flex:true}});
  assert.equal(p.mode,chrome>=88?'modern':'compatible');assert.equal(p.chrome,chrome);
 }
 for(const version of ['537.41','538.2'])assert.equal(selectProfile({userAgent:'AppleWebKit/'+version+' WebAppManager'}).support,'experimental');
});
test('missing native CSS features force conservative mode before polyfills',()=>{
 assert.equal(selectProfile({userAgent:'Chrome/132.0',features:{...features,aspectRatio:false}}).mode,'compatible');
 assert.equal(selectProfile({userAgent:'unknown',features}).mode,'compatible');
 assert.equal(selectProfile({userAgent:'LG NetCast 4.5'}).mode,'unsupported');
 assert.equal(selectProfile({userAgent:'LG NetCast Web0S WebAppManager Chrome/132',features}).mode,'modern');
});
test('old Node service callback validates identifiers without Promise, Map or WHATWG URL',async()=>{
 const code=await readFile(new URL('../news-service/feeds.cjs',import.meta.url),'utf8');
 const context={require:createRequire(import.meta.url),module:{exports:{}},Promise:undefined,URL:undefined,Map:undefined,setTimeout,clearTimeout,Buffer};
 vm.runInNewContext(code,context);
 let called=false;context.module.exports.readFeed('__proto__',error=>{called=true;assert.match(error.message,/Unknown feed/)});assert.ok(called);
 const allow=context.module.exports.allowedFeedUrl;
 for(const url of ['https://www.theguardian.com/film/rss','https://www.youtube.com/feeds/videos.xml'])assert.equal(allow(url),true);
 for(const url of ['http://www.theguardian.com/','https://www.theguardian.com.evil.test/','https://user:pass@www.theguardian.com/','https://127.0.0.1/','https://www.theguardian.com:444/'])assert.equal(allow(url),false);
});
