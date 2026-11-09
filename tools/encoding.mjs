import {readdir,readFile} from 'node:fs/promises';
import path from 'node:path';
export async function validateUtf8(root){
 const decoder=new TextDecoder('utf-8',{fatal:true});
 async function scan(dir){for(const entry of await readdir(dir,{withFileTypes:true})){
  const file=path.join(dir,entry.name);
  if(entry.isDirectory()){await scan(file);continue}
  if(!/\.(?:js|mjs|cjs|css|html|json|md)$/.test(file))continue;
  let text;try{text=decoder.decode(await readFile(file))}catch{throw Error('Invalid UTF-8: '+path.relative(root,file))}
  if(text.includes('\uFFFD'))throw Error('Unicode replacement character: '+path.relative(root,file));
 }}
 for(const dir of ['src','static','tools','tests','docs','news-service'])await scan(path.join(root,dir));
 decoder.decode(await readFile(path.join(root,'index.html')));
}
