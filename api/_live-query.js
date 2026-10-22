// Share live snapshots inside this server instance, including brief SSE reconnects.
// Authentication and per-view projection remain in the request handler.
export function createLiveQueries({idleMs=10000,maxIdle=80}={}){
 const entries=new Map();
 const dispose=(key,entry)=>{if(entries.get(key)!==entry)return;clearTimeout(entry.timer);entries.delete(key);entry.stop?.();};
 function subscribe(key,source,onData,onError){
  let entry=entries.get(key),fresh=!entry;
  if(!entry){entry={clients:new Set(),hasValue:false,stop:null,timer:null};entries.set(key,entry);}
  clearTimeout(entry.timer);const client={onData,onError,active:true};entry.clients.add(client);
  const deliver=value=>queueMicrotask(()=>{if(client.active)onData(value);});
  if(entry.hasValue)deliver(entry.value);
  if(fresh){try{entry.stop=source.onSnapshot(value=>{entry.hasValue=true;entry.value=value;for(const listener of entry.clients)queueMicrotask(()=>{if(listener.active)listener.onData(value);});},error=>{dispose(key,entry);for(const listener of entry.clients)queueMicrotask(()=>{if(listener.active)listener.onError(error);});});}catch(error){dispose(key,entry);queueMicrotask(()=>{if(client.active)onError(error);});}}
  return ()=>{
   if(!client.active)return;client.active=false;entry.clients.delete(client);
   if(!entry.clients.size&&entries.get(key)===entry){entry.timer=setTimeout(()=>dispose(key,entry),idleMs);entry.timer.unref?.();const idle=[...entries].filter(([,e])=>!e.clients.size);for(const [oldKey,oldEntry]of idle.slice(0,Math.max(0,idle.length-maxIdle)))dispose(oldKey,oldEntry);}
  };
 }
 return {subscribe,close(){for(const [key,entry]of entries)dispose(key,entry);}};
}
const databases=new WeakMap();
export function liveQuery(db,key,source,onData,onError){let pool=databases.get(db);if(!pool){pool=createLiveQueries();databases.set(db,pool);}return pool.subscribe(key,source,onData,onError);}
