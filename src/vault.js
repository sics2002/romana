// Separate IndexedDB mirror: no media URLs, account sessions, or credentials.
export function createVault(indexedDB) {
 if(indexedDB===undefined){try{indexedDB=globalThis.indexedDB}catch(_){return null}}
 if(!indexedDB)return null;
 let connection;
 function open(){return connection ||= new Promise((resolve,reject)=>{
   let finished=false;const request=indexedDB.open('sics-personal-library',1);
   const timer=setTimeout(()=>{finished=true;reject(Error('Vault timeout'))},2500);
   request.onupgradeneeded=()=>request.result.createObjectStore('library');
   request.onsuccess=()=>{clearTimeout(timer);if(finished){request.result.close();return}resolve(request.result)};
   request.onerror=()=>{clearTimeout(timer);reject(Error('Vault unavailable'))};
 });}
 async function transact(mode,name,value){const db=await open();return new Promise((resolve,reject)=>{
   let tx;
   if(mode==='readwrite'){
     try{tx=db.transaction('library',mode,{durability:'strict'})}
     catch(error){if(!(error instanceof TypeError))throw error;tx=db.transaction('library',mode)}
   }else tx=db.transaction('library',mode);
   const os=tx.objectStore('library');
   const request=mode==='readonly'?os.get(name):os.put(value,name);
   const timer=setTimeout(()=>{reject(Error('Vault transaction timeout'));try{tx.abort()}catch(_){}},2500);
   tx.oncomplete=()=>{clearTimeout(timer);resolve(request.result)};
   tx.onerror=tx.onabort=()=>{clearTimeout(timer);reject(Error('Vault transaction failed'))};
 });}
 return {get:name=>transact('readonly',name),set:(name,value)=>transact('readwrite',name,value)};
}
