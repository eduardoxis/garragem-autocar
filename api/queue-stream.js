import {adminDb} from './_firebase-admin.js';
import {allowSameOrigin,secureResponse,rateLimit,validJsonRequest} from './_security.js';
import {queueProfile,queueRecords,tvRecords,tvSession} from './_queue.js';
export default async function handler(req,res){secureResponse(res);
 if(!['GET','POST'].includes(req.method)||!allowSameOrigin(req)||!rateLimit(req,{limit:40})||(req.method==='POST'&&!validJsonRequest(req,1024)))return res.status(400).json({error:'Solicitação inválida'});
 let profile,session;try{if(req.method==='GET')session=await tvSession(req);else profile=await queueProfile(req);}catch(error){return res.status(error.status||400).json({error:error.message});}
 res.setHeader('Content-Type','text/event-stream; charset=utf-8');res.setHeader('Cache-Control','private, no-store, no-transform');res.setHeader('X-Accel-Buffering','no');res.flushHeaders?.();
 await new Promise(resolve=>{
  let finished=false,stopData=()=>{},stopIdentity=()=>{},stopMechanic=()=>{},company=null,timer,heartbeat;
  const send=data=>{if(!finished)res.write('data: '+JSON.stringify(data)+'\n\n');};
  const close=()=>{if(finished)return;finished=true;clearTimeout(timer);clearInterval(heartbeat);stopData();stopIdentity();stopMechanic();res.end();resolve();};
  const deny=message=>{send({type:'unauthorized',message});close();};
  const watch=companyId=>{if(company===companyId)return;stopData();company=companyId;const collection='queueEntries';stopData=adminDb.collection(collection).where('companyId','==',companyId).onSnapshot(snapshot=>{const records=profile?queueRecords(snapshot).filter(r=>profile.role==='admin'||r.mechanicId===profile.mechanicId):tvRecords(snapshot);send({type:'queue',records,label:session?.record.label||'Recepção'});},()=>{send({type:'error',message:'Sincronização temporariamente indisponível. Reconectando…'});close();});};
  res.on?.('close',close);req.on?.('aborted',close);
  if(profile){watch(profile.companyId);stopIdentity=adminDb.doc('users/'+profile.uid).onSnapshot(snapshot=>{const user=snapshot.data();if(!user?.active||user.deleted||user.companyId!==profile.companyId||user.role!==profile.role||(profile.role==='mecanico'&&user.mechanicId!==profile.mechanicId))deny('Sua permissão foi alterada. Entre novamente.');},()=>deny('Não foi possível validar sua permissão.'));if(profile.role==='mecanico')stopMechanic=adminDb.doc('mechanics/'+profile.mechanicId).onSnapshot(snapshot=>{const m=snapshot.data();if(!m||m.deleted||m.status!=='Ativo'||m.userId!==profile.uid||m.companyId!==profile.companyId)deny('Vínculo do mecânico indisponível.');},()=>deny('Vínculo indisponível.'));}
  else stopIdentity=session.ref.onSnapshot(snapshot=>{const current=snapshot.data();if(!current||current.revoked||Date.parse(current.expiresAt)<=Date.now())return deny('Autorização da TV expirada ou revogada.');session.record=current;if(current.status==='active'){send({type:'authorized',label:current.label||'Recepção'});watch(current.companyId);}else send({type:'pairing',code:current.pairCode});},()=>deny('Autorização indisponível.'));
  heartbeat=setInterval(()=>{if(session&&Date.parse(session.record.expiresAt)<=Date.now())return deny('Autorização da TV expirada.');if(!finished)res.write(': heartbeat\n\n');},10000);
  timer=setTimeout(close,45000);
 });
}
