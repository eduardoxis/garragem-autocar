import {liveQuery} from './_live-query.js';
import {workshopSchedule} from '../js/utils/workshop-hours.js';
import {queueOrder} from '../js/utils/queue.js';
import {workshopDay,validWorkshopDay,workshopRecords} from '../js/utils/workshop.js';
import {adminDb} from './_firebase-admin.js';
import {allowSameOrigin,secureResponse,rateLimit,validJsonRequest} from './_security.js';
import {queueProfile,queueRecords,tvRecords,tvSession,tvPanel} from './_queue.js';
export default async function handler(req,res){secureResponse(res);
 if(!['GET','POST'].includes(req.method)||!allowSameOrigin(req)||!rateLimit(req,{limit:40})||(req.method==='POST'&&!validJsonRequest(req,1024)))return res.status(400).json({error:'Solicitação inválida'});
 const workshop=(req.method==='GET'&&tvPanel(req)==='workshop')||(req.method==='POST'&&req.body?.view==='workshop'),workshopAdmin=req.method==='POST'&&req.body?.view==='workshop-admin';let day;
 let profile,session;try{if(req.method==='GET')session=await tvSession(req);else profile=await queueProfile(req);if(workshop){day=req.body?.day||workshopDay();if(!validWorkshopDay(day))throw Object.assign(Error('Dia inválido'),{status:400});if(profile&&profile.role!=='admin'&&day!==workshopDay())throw Object.assign(Error('Consulta de outros dias permitida somente ao administrador'),{status:403});}}catch(error){return res.status(error.status||400).json({error:error.message});}
 res.setHeader('Content-Type','text/event-stream; charset=utf-8');res.setHeader('Cache-Control','private, no-store, no-transform');res.setHeader('X-Accel-Buffering','no');res.flushHeaders?.();
 await new Promise(resolve=>{
  let finished=false,stopData=()=>{},stopIdentity=()=>{},stopMechanic=()=>{},stopRoster=()=>{},stopCompany=()=>{},entries=null,mechanics=null,schedule=null,lastDay=workshopDay(),company=null,timer,heartbeat;
  const send=data=>{if(!finished)res.write('data: '+JSON.stringify(data)+'\n\n');};
  const close=()=>{if(finished)return;finished=true;clearTimeout(timer);clearInterval(heartbeat);stopData();stopIdentity();stopMechanic();stopRoster();stopCompany();res.end();resolve();};
  const deny=message=>{send({type:'unauthorized',message});close();};
  const syncError=()=>{send({type:'error',message:'Sincronização temporariamente indisponível. Reconectando…'});close();};
  const publish=()=>{if(entries===null||schedule===null||(workshop&&mechanics===null))return;if(workshop){if(session)day=workshopDay();send({type:'workshop',day,records:workshopRecords(entries,day),mechanics,schedule});}else send({type:'queue',records:entries.filter(r=>!r.removed).sort(queueOrder),schedule});};
  const watch=companyId=>{
   if(company===companyId)return;stopData();stopRoster();stopCompany();entries=null;mechanics=null;schedule=null;company=companyId;
   if(workshop||workshopAdmin)stopCompany=liveQuery(adminDb,'company:'+companyId,adminDb.doc('companies/'+companyId),snapshot=>{schedule=workshopSchedule(snapshot.data()?.workshopSchedule);publish();},syncError);
   if(workshop)stopRoster=liveQuery(adminDb,'mechanics:'+companyId,adminDb.collection('mechanics').where('companyId','==',companyId),snapshot=>{mechanics=snapshot.docs.filter(d=>!d.data().deleted&&d.data().status==='Ativo'&&(!profile||profile.role==='admin'||d.id===profile.mechanicId)).map(d=>({id:d.id,name:d.data().name})).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));publish();},syncError);
   stopData=liveQuery(adminDb,'queue:'+companyId,adminDb.collection('queueEntries').where('companyId','==',companyId),snapshot=>{
    if(workshop||workshopAdmin){entries=snapshot.docs.map(d=>({id:d.id,...d.data()})).filter(r=>!profile||profile.role==='admin'||r.mechanicId===profile.mechanicId);publish();}
    else {const records=profile?queueRecords(snapshot).filter(r=>profile.role==='admin'||r.mechanicId===profile.mechanicId):tvRecords(snapshot);send({type:'queue',records,label:session?.record.label||'Recepção'});}
   },syncError);
  };
  res.on?.('close',close);req.on?.('aborted',close);
  if(profile){watch(profile.companyId);stopIdentity=liveQuery(adminDb,'user:'+profile.uid,adminDb.doc('users/'+profile.uid),snapshot=>{const user=snapshot.data();if(!user?.active||user.deleted||user.companyId!==profile.companyId||user.role!==profile.role||(profile.role==='mecanico'&&user.mechanicId!==profile.mechanicId))deny('Sua permissão foi alterada. Entre novamente.');},()=>deny('Não foi possível validar sua permissão.'));if(profile.role==='mecanico')stopMechanic=liveQuery(adminDb,'mechanic:'+profile.mechanicId,adminDb.doc('mechanics/'+profile.mechanicId),snapshot=>{const m=snapshot.data();if(!m||m.deleted||m.status!=='Ativo'||m.userId!==profile.uid||m.companyId!==profile.companyId)deny('Vínculo do mecânico indisponível.');},()=>deny('Vínculo indisponível.'));}
  else stopIdentity=liveQuery(adminDb,'tv:'+session.ref.id,session.ref,snapshot=>{const current=snapshot.data();if(!current||current.revoked||Date.parse(current.expiresAt)<=Date.now())return deny('Autorização da TV expirada ou revogada.');session.record=current;if(current.status==='active'){send({type:'authorized',label:current.label||'Recepção'});watch(current.companyId);}else send({type:'pairing',code:current.pairCode});},()=>deny('Autorização indisponível.'));
  heartbeat=setInterval(()=>{if(workshop&&session&&lastDay!==workshopDay()){lastDay=workshopDay();publish();}if(session&&Date.parse(session.record.expiresAt)<=Date.now())return deny('Autorização da TV expirada.');if(!finished)res.write(': heartbeat\n\n');},10000);
  timer=setTimeout(close,45000);
 });
}
