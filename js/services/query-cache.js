// Memory only; bounded, scoped per signed-in user and invalidated after mutations.
export function createQueryCache({maxEntries=160,now=()=>Date.now()}={}){
 const entries=new Map();
 const invalidate=(tags=null)=>{for(const [key,entry]of entries)if(!tags||entry.tags.some(tag=>tags.includes(tag)))entries.delete(key);};
 const read=(key,loader,{ttl=30000,tags=[],force=false}={})=>{
  if(force)entries.delete(key);const previous=entries.get(key);
  if(previous&&(previous.pending||previous.expires>now()))return previous.promise;
  entries.delete(key);const entry={tags,pending:true,expires:0};
  entry.promise=Promise.resolve().then(loader).then(value=>{entry.pending=false;entry.expires=now()+ttl;if(!ttl&&entries.get(key)===entry)entries.delete(key);return value;},error=>{if(entries.get(key)===entry)entries.delete(key);throw error;});
  entries.set(key,entry);while(entries.size>maxEntries){const candidate=[...entries].find(([,e])=>!e.pending);entries.delete(candidate?.[0]||entries.keys().next().value);}return entry.promise;
 };
 return {read,invalidate};
}
export const queryCache=createQueryCache();
export function invalidateQueries(tags=null){queryCache.invalidate(tags);if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('gac:datachange',{detail:{tags}}));}
if(typeof window!=='undefined'){
 window.addEventListener('focus',()=>invalidateQueries());
 window.addEventListener('pagehide',()=>invalidateQueries());
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')invalidateQueries();});
}
// Preserve immutable Firestore snapshots/Timestamps used as pagination cursors.
export function copyQueryResult(value){if(Array.isArray(value))return value.map(copyQueryResult);if(value instanceof Date)return new Date(value);if(value&&Object.getPrototypeOf(value)===Object.prototype)return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,copyQueryResult(v)]));return value;}
