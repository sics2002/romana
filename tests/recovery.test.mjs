import test from 'node:test';
import assert from 'node:assert/strict';
import {createStore} from '../src/storage.js';
const item={id:'123',title:'Movie',kind:'movie',genres:['دراما','رومانسي']};
function memory(){const data=new Map();return {data,getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)}}
test('new store recovers favorites and resume after primary keys disappear',()=>{
 const db=memory(),store=createStore(db);store.toggleFavorite(item);store.saveProgress(item,45,300);
 db.data.delete('cinemana-tv.v1.favorites');db.data.set('cinemana-tv.v1.progress','corrupt');
 const reopened=createStore(db);assert.equal(reopened.favorites()[0].id,'123');assert.equal(reopened.getProgress('123').position,45);assert.deepEqual(reopened.favorites()[0].genres,item.genres);
});
test('intentional favorite removal does not resurrect from shadow or vault',async()=>{
 const db=memory(),mirror=new Map(),vault={get:async k=>mirror.get(k),set:async(k,v)=>mirror.set(k,v)};
 const store=createStore(db,Date.now,vault);store.toggleFavorite(item);store.toggleFavorite(item);await store.flush();
 const reopened=createStore(db,Date.now,vault);await reopened.ready();assert.deepEqual(reopened.favorites(),[]);assert.deepEqual(mirror.get('favorites'),[]);
});
test('independent mirror restores cleared local storage without playback URLs',async()=>{
 const db=memory(),mirror=new Map(),vault={get:async k=>mirror.get(k),set:async(k,v)=>mirror.set(k,v)};
 const store=createStore(db,Date.now,vault);store.toggleFavorite({...item,videoUrl:'SECRET'});store.saveProgress(item,99,300);await store.flush();db.data.clear();
 const recovered=createStore(db,Date.now,vault);await recovered.ready();assert.equal(recovered.favorites().length,1);assert.equal(recovered.getProgress('123').position,99);assert.equal(recovered.recovered(),2);assert.equal(JSON.stringify([...mirror]).includes('SECRET'),false);
});
test('legacy local records migrate without being replaced by stale mirror',async()=>{
 const db=memory();db.data.set('cinemana-tv.v1.favorites',JSON.stringify([item]));const vault={get:async()=>[],set:async()=>{}};
 const store=createStore(db,Date.now,vault);await store.ready();assert.equal(store.favorites()[0].id,'123');
});

test('empty or corrupt local progress cannot erase a surviving mirror', async () => {
 for (const local of ['[]', '{broken']) {
  const db = memory();
  const key = 'cinemana-tv.v1.progress';
  db.data.set(key, local);
  db.data.set(key + '.backup', '{broken');
  let saved = [{...item, position: 90, duration: 600, updatedAt: 2}];
  const store = createStore(db, Date.now, {get: async key => key === 'progress' ? saved : undefined, set: async (key, value) => { if (key === 'progress') saved = value; }});
  await store.ready();
  await store.flush();
  assert.equal(store.getProgress(item.id).position, 90);
  assert.equal(saved[0].position, 90);
  assert.equal(createStore(db).getProgress(item.id).position, 90);
 }
});

test('partial writes reconcile per title and preserve a newer rewind', async () => {
 const db = memory();
 const key = 'cinemana-tv.v1.progress';
 const entry = {...item, position: 90, duration: 600, updatedAt: 2};
 db.data.set(key, JSON.stringify([entry]));
 db.data.set(key + '.backup', JSON.stringify({value: [{...entry, position: 30, updatedAt: 1}]}));
 assert.equal(createStore(db).getProgress(item.id).position, 90);
 const store = createStore(db, Date.now, {
  get: async name => name === 'progress' ? [
   {...entry, position: 40, updatedAt: 3},
   {...entry, position: null, updatedAt: 4},
   {...entry, id: '456'},
  ] : undefined,
  set: async () => {},
 });
 await store.ready();
 assert.equal(store.getProgress(item.id).position, 40);
 assert.equal(store.getProgress('456').position, 90);
});

test('failed mirror read leaves its progress untouched during startup', async () => {
 const db = memory();
 const original = createStore(db);
 original.saveProgress(item, 45, 300);
 const writes = [];
 const store = createStore(db, Date.now, {
  get: async () => { throw Error('Unavailable'); },
  set: async key => { writes.push(key); },
 });
 await store.ready();
 await store.flush();
 assert.equal(store.getProgress(item.id).position, 45);
 assert.deepEqual(writes, []);
});
