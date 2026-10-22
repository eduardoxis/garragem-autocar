import { adminDb, requireAdmin, requireStaff, FieldValue } from './_firebase-admin.js';
import { validId } from './_checklist.js';
import { allowSameOrigin, secureResponse, validJsonRequest, rateLimit } from './_security.js';

const toRecord=doc=>{const data=doc.data();return {id:doc.id,...data,createdAt:data.createdAt?.toDate?.().toISOString()||data.createdAt,updatedAt:data.updatedAt?.toDate?.().toISOString()||data.updatedAt};};
export default async function handler(req,res){
 secureResponse(res);
 if(req.method!=='POST'||!allowSameOrigin(req)||!validJsonRequest(req)||!rateLimit(req,{limit:100}))return res.status(400).json({error:'Solicitação inválida'});
 try{
  const {action,id,data={},after,activeOnly=false}=req.body||{};
  if(['list','count','get'].includes(action)){
   const profile=await requireStaff(req,['admin','atendente','mecanico']);
   if(action==='get'){
    if(!validId(id))throw new Error('Mecânico inválido');const doc=await adminDb.doc('mechanics/'+id).get();const record=doc.exists?toRecord(doc):null;
    if(!record||record.companyId!==profile.companyId||record.deleted)throw Object.assign(new Error('Mecânico indisponível'),{status:403});
    return res.status(200).json(record);
   }
   const snapshot=await adminDb.collection('mechanics').where('companyId','==',profile.companyId).get();
   let records=snapshot.docs.map(toRecord).filter(record=>!record.deleted&&(!activeOnly||record.status==='Ativo'));
   records.sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')||a.id.localeCompare(b.id));
   if(action==='count')return res.status(200).json({count:records.length});
   const pageSize=Math.min(1000,Math.max(1,Math.floor(Number(req.body.pageSize)||20)));
   const start=after?records.findIndex(record=>record.id===after)+1:0;
   if(after&&start===0)throw new Error('Página indisponível. Atualize a lista.');
   const page=records.slice(start,start+pageSize),hasMore=start+pageSize<records.length;
   return res.status(200).json({records:page,total:records.length,cursor:hasMore?page.at(-1).id:null,hasMore});
  }
  const profile=await requireAdmin(req);
  if(!['save','delete'].includes(action))throw new Error('Ação inválida');
  if(id&&!validId(id))throw new Error('Mecânico inválido');
  if(action==='delete'&&!id)throw new Error('Mecânico inválido');
  const ref=id?adminDb.doc('mechanics/'+id):adminDb.collection('mechanics').doc();
  let safe;
  if(action==='save'){
   const name=String(data.name||'').trim();if(name.length<2||name.length>120)throw new Error('Informe o nome do mecânico, entre 2 e 120 caracteres.');
   if(!['Ativo','Inativo'].includes(data.status))throw new Error('Status inválido');
   safe={name,userId:String(data.userId||'').trim(),phone:String(data.phone||'').replace(/\D/g,'').slice(0,20),specialty:String(data.specialty||'').trim().slice(0,120),notes:String(data.notes||'').trim().slice(0,2000),status:data.status};
  }
  await adminDb.runTransaction(async tx=>{
   const previous=await tx.get(ref);
   if(id&&(!previous.exists||previous.data().companyId!==profile.companyId||previous.data().deleted))throw Object.assign(new Error('Mecânico indisponível'),{status:403});
   const previousUserId=previous.data()?.userId||'';let previousUserRef=null;let previousUser=null;
   if(previousUserId&&(action==='delete'||previousUserId!==safe?.userId)){previousUserRef=adminDb.doc('users/'+previousUserId);previousUser=(await tx.get(previousUserRef)).data();}
   let userRef=null;
   if(action==='save'&&safe.userId){if(!validId(safe.userId))throw new Error('Usuário inválido');userRef=adminDb.doc('users/'+safe.userId);const user=(await tx.get(userRef)).data();if(!user||user.companyId!==profile.companyId||user.deleted||!user.active||user.role!=='mecanico')throw new Error('Selecione um usuário ativo com perfil Mecânico da mesma empresa.');if(user.mechanicId&&user.mechanicId!==ref.id){const assigned=(await tx.get(adminDb.doc('mechanics/'+user.mechanicId))).data();if(assigned&&!assigned.deleted)throw new Error('Este usuário já está vinculado a outro mecânico.');}}
   if(previousUserRef&&previousUser?.mechanicId===ref.id)tx.update(previousUserRef,{mechanicId:null});
   if(userRef)tx.update(userRef,{mechanicId:ref.id});
   if(action==='delete')tx.update(ref,{deleted:true,deletedBy:profile.uid,deletedAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()});
   else tx.set(ref,{...safe,companyId:profile.companyId,deleted:false,updatedAt:FieldValue.serverTimestamp(),...(!id?{createdAt:FieldValue.serverTimestamp(),createdBy:profile.uid}:{})},{merge:Boolean(id)});
  });
  return res.status(200).json({id:ref.id});
 }catch(error){return res.status(error.status||400).json({error:error.message||'Não foi possível concluir.'});}
}
