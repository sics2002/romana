// Collect actual matches across source pages, retaining overflow for the next 50.
// State commits after each response; failed requests can retry without losing matches.
export async function collectSearchBatch(state,{fetchPage,filter=x=>x,pageSize=30,size=50,valid=()=>true,onProgress=()=>{}}){
 state.buffer=state.buffer||[];state.sourceIds=state.sourceIds||[];
 if(state.sourceMore===undefined)state.sourceMore=true;
 const seen=new Set([...state.sourceIds,...state.items.map(x=>x.id)]);
 while(state.buffer.length<size&&state.sourceMore){
  if(!valid())return null;
  const next=await fetchPage(state.page);
  if(!valid())return null;
  const unique=next.filter(item=>{if(seen.has(item.id))return false;seen.add(item.id);return true});
  state.buffer.push(...filter(unique));state.page++;
  state.sourceIds=[...seen];
  state.sourceMore=next.length>=pageSize&&unique.length>0;
  onProgress();
 }
 if(!valid())return null;
 return {items:state.buffer.splice(0,size),hasMore:state.sourceMore||state.buffer.length>0};
}
