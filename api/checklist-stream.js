import {adminDb,requireStaff} from './_firebase-admin.js';
import {allowSameOrigin,validJsonRequest,secureResponse,rateLimit} from './_security.js';
import {liveQuery} from './_live-query.js';
export default async function handler(req,res){
 secureResponse(res);
 if(req.method!=='POST'||!allowSameOrigin(req)||!validJsonRequest(req,1024)||!rateLimit(req,{limit:40}))return res.status(400).json({error:'Solicitação inválida'});
 let profile;try{profile=await requireStaff(req,['admin','atendente','mecanico']);}catch(error){return res.status(error.status||400).json({error:error.message});}
 res.setHeader('Content-Type','text/event-stream; charset=utf-8');res.setHeader('Cache-Control','private, no-store, no-transform');res.setHeader('X-Accel-Buffering','no');res.flushHeaders?.();
 await new Promise(resolve=>{
  let closed=false,stopData=()=>{},stopIdentity=()=>{},timer,heartbeat,first=true;let previous=new Map();
  const send=value=>{if(!closed)res.write('data: '+JSON.stringify(value)+'\n\n');};
  const close=()=>{if(closed)return;closed=true;clearTimeout(timer);clearInterval(heartbeat);stopData();stopIdentity();res.end();resolve();};
  const deny=()=>{send({type:'unauthorized',message:'Sua permissão foi alterada. Entre novamente.'});close();};
  const error=()=>{send({type:'error',message:'Reconectando os checklists…'});close();};
  res.on?.('close',close);req.on?.('aborted',close);
  stopIdentity=liveQuery(adminDb,'user:'+profile.uid,adminDb.doc('users/'+profile.uid),snapshot=>{const user=snapshot.data();if(!user?.active||user.deleted||user.companyId!==profile.companyId||user.role!==profile.role)deny();},deny);
  stopData=liveQuery(adminDb,'checklists:'+profile.companyId,adminDb.collection('checklists').where('companyId','==',profile.companyId),snapshot=>{
   if(closed)return;const next=new Map(),changed=[],removed=[];
   for(const doc of snapshot.docs){const data=doc.data();if(data.deleted)continue;const record={...data,id:doc.id};next.set(doc.id,record);const old=previous.get(doc.id);if(first||!old||old.revision!==record.revision||old.updatedAt!==record.updatedAt||JSON.stringify(old)!==JSON.stringify(record))changed.push(record);}
   for(const id of previous.keys())if(!next.has(id))removed.push(id);
   if(first||changed.length||removed.length)send({type:'checklists',initial:first,records:changed,removed});previous=next;first=false;
  },error);
  heartbeat=setInterval(()=>{if(!closed)res.write(': heartbeat\n\n');},10000);timer=setTimeout(close,45000);
 });
}
