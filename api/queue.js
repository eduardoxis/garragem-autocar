import {adminDb} from './_firebase-admin.js';
import {validId} from './_checklist.js';
import {allowSameOrigin,validJsonRequest,secureResponse,rateLimit} from './_security.js';
import {queueStatuses,queueOrder} from '../js/utils/queue.js';
import {queueProfile,requireQueueAdmin,ownQueue,writeQueue,now,hash,fail,queueRecords} from './_queue.js';
const plate=value=>String(value||'').replace(/[^a-z0-9]/gi,'').toUpperCase();
const lock=(companyId,value)=>adminDb.doc('queueVehicleLocks/'+hash(companyId+':'+value));
async function input(tx,profile,data,old){
 let order=null,vehicle=null;
 if(data.serviceOrderId){if(!validId(data.serviceOrderId))throw fail('OS inválida');order=(await tx.get(adminDb.doc('serviceOrders/'+data.serviceOrderId))).data();if(!order||order.companyId!==profile.companyId||order.deleted)throw fail('OS indisponível');}
 const vehicleId=data.vehicleId||order?.vehicleId||'';
 if(vehicleId){if(!validId(vehicleId))throw fail('Veículo inválido');vehicle=(await tx.get(adminDb.doc('vehicles/'+vehicleId))).data();if(!vehicle||vehicle.companyId!==profile.companyId||vehicle.deleted)throw fail('Veículo indisponível');if(order?.vehicleId&&order.vehicleId!==vehicleId)throw fail('A OS pertence a outro veículo');}
 if(!validId(data.mechanicId))throw fail('Selecione o mecânico responsável');
 const mechanic=(await tx.get(adminDb.doc('mechanics/'+data.mechanicId))).data();
 if(!mechanic||mechanic.companyId!==profile.companyId||mechanic.deleted||mechanic.status!=='Ativo')throw fail('Selecione um mecânico ativo da empresa');
 const vehicleName=String(vehicle?[vehicle.brand,vehicle.model].filter(Boolean).join(' '):data.vehicle||order?.vehicle||'').trim();
 const vehiclePlate=plate(vehicle?.plate||data.plate||order?.plate),service=String(data.service||'').trim(),forecastDate=String(data.forecastDate||'');
 if(!vehicleName||vehicleName.length>80||vehiclePlate.length!==7)throw fail('Informe o veículo (até 80 caracteres) e uma placa válida');
 if(!service||service.length>80)throw fail('Informe o serviço com até 80 caracteres');
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(forecastDate)||Number.isNaN(Date.parse(forecastDate)))throw fail('Informe a previsão de conclusão');
 if(!queueStatuses.includes(data.status||old?.status||'Aguardando'))throw fail('Status inválido');
 return {vehicleId,serviceOrderId:data.serviceOrderId||'',serviceOrderCode:order?.code||'',vehicle:vehicleName,plate:vehiclePlate,service,mechanicId:data.mechanicId,mechanicName:mechanic.name,status:data.status||old?.status||'Aguardando',forecastDate,internalNotes:String(data.internalNotes||'').slice(0,2000)};
}
export default async function handler(req,res){secureResponse(res);
 if(req.method!=='POST'||!allowSameOrigin(req)||!validJsonRequest(req,32768)||!rateLimit(req,{limit:120}))return res.status(400).json({error:'Solicitação inválida'});
 try{const profile=await queueProfile(req);const {action,id,data={},revision,direction}=req.body||{};
 if(action==='list'){const snapshot=await adminDb.collection('queueEntries').where('companyId','==',profile.companyId).get();return res.status(200).json({records:queueRecords(snapshot).filter(r=>profile.role==='admin'||r.mechanicId===profile.mechanicId)});}
 if(action==='references'){requireQueueAdmin(profile);const [vehicles,orders,mechanics]=await Promise.all(['vehicles','serviceOrders','mechanics'].map(c=>adminDb.collection(c).where('companyId','==',profile.companyId).get()));return res.status(200).json({vehicles:vehicles.docs.filter(d=>!d.data().deleted).map(d=>({id:d.id,brand:d.data().brand||'',model:d.data().model||'',plate:d.data().plate||''})),orders:orders.docs.filter(d=>!d.data().deleted&&!['Entregue','Cancelado'].includes(d.data().status)).map(d=>{const r=d.data();return {id:d.id,code:r.code||'',vehicleId:r.vehicleId||'',vehicle:r.vehicle||'',plate:r.plate||'',service:r.service||r.items?.map(i=>i.description).join(', ')||'',forecastDate:r.forecastDate||'',mechanicId:r.mechanicId||r.responsibleId||''};}),mechanics:mechanics.docs.filter(d=>!d.data().deleted&&d.data().status==='Ativo').map(d=>({id:d.id,name:d.data().name}))});}
 if(action==='history'){if(!validId(id))throw fail('Atendimento inválido');ownQueue((await adminDb.doc('queueEntries/'+id).get()).data(),profile);const snapshot=await adminDb.doc('queueEntries/'+id).collection('history').orderBy('at','desc').limit(100).get();return res.status(200).json({history:snapshot.docs.map(d=>d.data())});}
 if(!['save','update','move','finish','remove'].includes(action))throw fail('Ação inválida');
 if(action!=='update')requireQueueAdmin(profile);
 if(id&&!validId(id))throw fail('Atendimento inválido');if(action!=='save'&&!id)throw fail('Atendimento inválido');
 const ref=id?adminDb.doc('queueEntries/'+id):adminDb.collection('queueEntries').doc();let adjacent=null;
 if(action==='move'){if(!['up','down'].includes(direction))throw fail('Movimento inválido');const entries=queueRecords(await adminDb.collection('queueEntries').where('companyId','==',profile.companyId).get());const index=entries.findIndex(r=>r.id===id);if(index<0)throw fail('Atendimento indisponível');adjacent=entries[index+(direction==='up'?-1:1)];if(!adjacent)return res.status(200).json({ok:true});}
 const result=await adminDb.runTransaction(async tx=>{
  const previous=await tx.get(ref),old=previous.data();
  if(id){ownQueue(old,profile);if(!old.active||old.removed)throw fail('Atendimento já encerrado');if(revision!==old.revision)throw fail('A fila foi alterada. Aguarde a atualização e tente novamente.',409);}
  if(action==='move'){const otherRef=adminDb.doc('queueEntries/'+adjacent.id),other=(await tx.get(otherRef)).data();ownQueue(other,profile);if(!other.active||other.position!==adjacent.position)throw fail('A ordem mudou. Tente novamente.',409);const a=writeQueue(tx,ref,{...old,position:other.position},old,profile,'Reordenação');writeQueue(tx,otherRef,{...other,position:old.position},other,profile,'Reordenação');return a;}
  if(action==='finish'||action==='remove'){const vehicleLock=lock(profile.companyId,old.plate);await tx.get(vehicleLock);const record=writeQueue(tx,ref,{...old,status:action==='finish'?'Pronto':old.status,active:false,removed:action==='remove',closedAt:now()},old,profile,action==='finish'?'Atendimento finalizado':'Removido da fila');tx.delete(vehicleLock);return record;}
  if(action==='update'){
   if(Object.keys(data).some(k=>!['status','internalNotes'].includes(k)))throw fail('Esta ação permite alterar apenas status e observações.',403);
   if(data.status!==undefined&&!queueStatuses.includes(data.status))throw fail('Status inválido');
   return writeQueue(tx,ref,{...old,...(data.status!==undefined?{status:data.status}:{}),...(data.internalNotes!==undefined?{internalNotes:String(data.internalNotes).slice(0,2000)}:{})},old,profile,'Status / observações');
  }
  const safe=await input(tx,profile,data,old),nextLock=lock(profile.companyId,safe.plate),held=(await tx.get(nextLock)).data();
  if(held&&held.entryId!==ref.id)throw fail('Este veículo já está na fila. Edite o atendimento existente.',409);
  let oldLock=null;if(old&&old.plate!==safe.plate){oldLock=lock(profile.companyId,old.plate);await tx.get(oldLock);}
  const metaRef=adminDb.doc('queueMetadata/'+profile.companyId),meta=id?null:(await tx.get(metaRef)).data();const position=old?.position??(meta?.nextPosition||0)+1;
  const record=writeQueue(tx,ref,{...old,...safe,companyId:profile.companyId,active:true,removed:false,position,enteredAt:old?.enteredAt||now(),createdBy:old?.createdBy||profile.uid},old,profile,id?'Atendimento editado':'Entrada na fila');
  tx.set(nextLock,{companyId:profile.companyId,entryId:ref.id});if(oldLock)tx.delete(oldLock);if(!id)tx.set(metaRef,{companyId:profile.companyId,nextPosition:position});return record;
 });return res.status(200).json(result);
 }catch(error){return res.status(error.status||400).json({error:error.message||'Não foi possível atualizar a fila.'});}
}
