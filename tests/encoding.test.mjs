import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateUtf8} from '../tools/encoding.mjs';
test('project text is valid UTF-8 and contains no replacement characters',async()=>{
 await validateUtf8(new URL('..',import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1'));
});
test('home Arabic strings survive source encoding',async()=>{
 const source=await readFile(new URL('../src/main.js',import.meta.url),'utf8');
 const home=source.slice(source.indexOf('async function home(token)'),source.indexOf('async function catalog(token)'));
 for(const text of ['أكمل من حيث توقفت','المزيد من الأقسام','لا يوجد محتوى'])assert.ok(home.includes(text),text);
});
