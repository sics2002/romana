import test from 'node:test';
import assert from 'node:assert/strict';
import {SearchControls} from '../src/search-controls.js';
function ui(t){
 const previous=globalThis.document,listeners={},body={},doc={body,documentElement:{dir:'rtl'},activeElement:body,addEventListener(n,f){listeners[n]=f},removeEventListener(n){delete listeners[n]},createEvent(){return {initEvent(name){this.type=name}}}};
 globalThis.document=doc;
 const fields=[],form={dataset:{},contains:x=>fields.includes(x),querySelectorAll:()=>fields,submissions:0,dispatchEvent(){this.submissions++}};
 function field(id,tag='BUTTON'){const el={dataset:{focus:id},tagName:tag,hidden:false,disabled:false,focus(){doc.activeElement=this},click(){this.onclick?.()},blur(){if(doc.activeElement===this){doc.activeElement=body;this.onblur?.({relatedTarget:null})}}};fields.push(el);return el}
 const entry=field('search-entry'),input=field('search-input','INPUT'),category=field('search-category'),submit=field('search-submit');input.hidden=true;input.value='Batman';
 const focus={focus(id){fields.find(x=>x.dataset.focus===id)?.focus()}};
 const control=new SearchControls({form,input,entry,focus});submit.onclick=()=>control.requestSearch();
 const keyboard=visible=>listeners.keyboardStateChange({detail:{visibility:visible}});
 t.after(()=>{control.destroy();globalThis.document=previous});
 return {doc,form,entry,input,category,submit,control,keyboard};
}
test('native keyboard blur does not hide the input while keyboard is visible',async t=>{
 const x=ui(t);x.entry.click();x.keyboard(true);x.input.blur();await new Promise(r=>setTimeout(r,220));assert.equal(x.control.editing,true);assert.equal(x.input.hidden,false);
 x.keyboard(false);await new Promise(r=>setTimeout(r,90));assert.equal(x.control.editing,false);assert.equal(x.input.hidden,true);assert.equal(x.doc.activeElement,x.category);assert.equal(x.entry.textContent,'Batman');
});
test('OK on search button dispatches one search, without relying on native form defaults',t=>{
 const x=ui(t);x.submit.focus();assert.equal(x.control.handleKey({keyCode:13}),true);assert.equal(x.form.submissions,1);
});
test('OK after keyboard closes submits the current text rather than only hiding input',t=>{
 const x=ui(t);x.entry.click();assert.equal(x.control.handleKey({keyCode:13}),true);assert.equal(x.form.submissions,1);assert.equal(x.input.value,'Batman');
});
test('old TV character events without event.key are passed to the native input',t=>{
 const x=ui(t);x.entry.click();assert.equal(x.control.handleKey({keyCode:65}),'native');assert.equal(x.control.editing,true);
});
test('keyboard close cannot steal focus from an already open category picker',async t=>{
 const x=ui(t);x.entry.click();x.keyboard(true);x.control.modal={remove(){}};const choice={tagName:'BUTTON'};x.doc.activeElement=choice;x.keyboard(false);await new Promise(r=>setTimeout(r,90));assert.equal(x.doc.activeElement,choice);assert.equal(x.control.editing,false);
});
test('Back returns from input to category and arrows reach the submit button',t=>{
 const x=ui(t);x.entry.click();x.keyboard(true);assert.equal(x.control.handleKey({keyCode:461}),true);assert.equal(x.doc.activeElement,x.category);assert.equal(x.control.handleKey({keyCode:37}),true);assert.equal(x.doc.activeElement,x.submit);
});

test('remote OK opens input only after key release and does not submit on that gesture',async t=>{
 const x=ui(t);x.entry.focus();x.control.handleKey({keyCode:13});assert.equal(x.input.hidden,true);
 x.control.release({keyCode:13});await new Promise(r=>setTimeout(r,10));assert.equal(x.input.hidden,false);assert.equal(x.doc.activeElement,x.input);assert.equal(x.form.submissions,0);
});
test('early keyboard-hidden event cannot dismiss an input whose IME is still opening',async t=>{
 const x=ui(t);x.entry.click();x.keyboard(false);await new Promise(r=>setTimeout(r,90));assert.equal(x.input.hidden,false);
 x.keyboard(true);x.keyboard(false);await new Promise(r=>setTimeout(r,90));assert.equal(x.input.hidden,true);
});
test('destroy cancels a queued OK-release opening on route changes',async t=>{
 const x=ui(t);x.entry.focus();x.control.handleKey({which:13});x.control.release({which:13});x.control.destroy();await new Promise(r=>setTimeout(r,10));assert.equal(x.input.hidden,true);
});

test('a native click after OK release cannot open the keyboard a second time',async t=>{
 const x=ui(t);x.entry.focus();x.control.handleKey({keyCode:13});x.control.release({keyCode:13});x.entry.click();const session=x.control.editSession;
 x.keyboard(true);await new Promise(r=>setTimeout(r,10));assert.equal(x.control.editSession,session);assert.equal(x.control.keyboardSeen,true);
});
