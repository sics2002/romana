import test from 'node:test';
import assert from 'node:assert/strict';
import {loadNewsCache} from '../src/news-data.js';

test('a corrupt news row cannot discard intact cache rows or crash date formatting', () => {
  const saved = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const row = {id:'film',title:'Movies',updatedAt:1e30,items:[null,{id:'film-1',title:'Article',url:'https://www.theguardian.com/film/article'}]};
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{
    getItem:()=>JSON.stringify({time:Date.now(),rows:[null,{id:'bad',items:42},row]}),
  }});
  try {
    const rows = loadNewsCache();
    assert.equal(rows.length, 1);
    assert.equal(rows[0].updatedAt, 0);
    assert.equal(rows[0].items[0].id, 'film-1');
  } finally {
    if (saved) Object.defineProperty(globalThis,'localStorage',saved);
    else delete globalThis.localStorage;
  }
});
