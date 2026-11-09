export function createWordmark(doc,credit='by sics2002'){
 const mark=doc.createElement('span');mark.className='wordmark';mark.setAttribute('dir','ltr');
 const name=doc.createElement('span');name.className='wordmark-name';name.textContent='ROMANA';
 const by=doc.createElement('small');by.className='wordmark-credit';by.textContent=credit;
 mark.append(name);mark.append(by);return mark;
}
