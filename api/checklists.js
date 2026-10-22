import { randomBytes } from 'node:crypto';
import { adminDb, requireStaff } from './_firebase-admin.js';
import { allowSameOrigin, secureResponse, validJsonRequest, rateLimit } from './_security.js';
import { context, hashToken, validId } from './_checklist.js';
import { cleanChecklist, declaration, disclaimer, canRespond } from '../js/utils/checklist.js';
const stamp=()=>new Date().toISOString();
function event(tx,ref,action,actor,details={}){tx.set(ref.collection('events').doc(),{action,at:stamp(),actor,...details});}
export default async function handler(req,res){
 secureResponse(res);if(req.method!=='POST')return res.status(405).json({error:'Método não permitido'});
 if(!allowSameOrigin(req)||!validJsonRequest(req,350000)||!rateLimit(req,{limit:80}))return res.status(400).json({error:'Solicitação inválida'});
 try{const {action,id,data,token,revision,method,version}=req.body||{};
 if(action==='list'){const p=await requireStaff(req,['admin','atendente','mecanico']);let query=adminDb.collection('checklists').where('companyId','==',p.companyId).orderBy('createdAt','desc').limit(25);if(req.body.after){if(!validId(req.body.after))throw new Error('Página inválida');const cursor=await adminDb.doc('checklists/'+req.body.after).get();if(!cursor.exists||cursor.data().companyId!==p.companyId)throw new Error('Página inválida');query=query.startAfter(cursor);}const q=await query.get();return res.status(200).json({records:q.docs.filter(d=>!d.data().deleted).map(d=>({id:d.id,...d.data()})),nextCursor:q.size===25?q.docs.at(-1).id:null});}
 if(action==='save'&&!id){const p=await requireStaff(req,['admin','atendente','mecanico']);const content=cleanChecklist(data);const ref=adminDb.collection('checklists').doc();await validateRelations(p.companyId,content);await validateResponsible(p.companyId,content);if(content.media.length)throw new Error('Salve antes de anexar arquivos.');const r={companyId:p.companyId,code:'CHK-'+ref.id.slice(0,8).toUpperCase(),version:1,revision:1,status:'Em preenchimento',confirmation:{status:'Não enviado'},data:content,createdAt:stamp(),updatedAt:stamp(),createdBy:p.uid};const b=adminDb.batch();b.set(ref,r);b.set(ref.collection('events').doc(),{at:stamp(),action:'Criação / início da vistoria',actor:p.uid});await b.commit();return res.status(200).json({id:ref.id,...r});}
 const c=await context(req,id,token);const actor=c.public?'Cliente por link':c.profile.uid;
 if(action==='delete'&&(c.public||c.profile.role!=='admin'))throw Object.assign(new Error('Somente o administrador pode excluir checklists.'),{status:403});
 if(action==='get'){
 const history=c.public?[]:(await c.ref.collection('events').orderBy('at','asc').get()).docs.map(d=>d.data());
 const versions=c.public?[]:(await c.ref.collection('versions').get()).docs.map(d=>({id:d.id,...d.data()}));
 if(version&&!c.public){if(!/^\d+$/.test(String(version)))throw new Error('Versão inválida');const old=(await c.ref.collection('versions').doc(String(version)).get()).data();if(!old)throw new Error('Versão indisponível');return res.status(200).json({id:c.ref.id,...old,history,versions});}
 return res.status(200).json({id:c.ref.id,...(c.public?{code:c.record.code,version:c.record.version,status:c.record.status,data:c.record.data,method:c.link.method,confirmation:c.record.confirmation}:c.record),history,versions});}
 if(c.public&&!['confirm','sign','review'].includes(action))throw new Error('Ação não permitida.');
 let content;if(action==='save'){content=cleanChecklist(data);await validateRelations(c.profile.companyId,content);for(const m of content.media){if(!validId(m.id))throw new Error('Arquivo inválido');const meta=(await adminDb.doc('checklistMedia/'+m.id).get()).data();if(!meta||meta.checklistId!==c.ref.id||meta.kind==='signature')throw new Error('Arquivo inválido');}}
 const result=await adminDb.runTransaction(async tx=>{
 const snap=await tx.get(c.ref),r=snap.data();if(!r||r.deleted)throw new Error('Registro indisponível');
 if(c.public){const link=(await tx.get(c.linkRef)).data();if(!link)throw new Error('Link revogado');canRespond(r,link);}
 if(!c.public && revision!==r.revision)throw new Error('O registro foi alterado. Reabra antes de continuar.');
 let patch={},extra={};
 if(action==='save')await validateResponsible(r.companyId,content,tx);
 if(action==='finalize')await validateResponsible(r.companyId,{...r.data},tx);
 if(action==='save'){const oldIds=new Set(r.data.media.map(m=>m.id)),newIds=new Set(content.media.map(m=>m.id));for(const mediaId of newIds)if(!oldIds.has(mediaId))event(tx,c.ref,'Inclusão de mídia',actor,{mediaId,version:r.version});for(const mediaId of oldIds)if(!newIds.has(mediaId))event(tx,c.ref,'Remoção de mídia da versão em edição',actor,{mediaId,version:r.version});if(r.status!=='Em preenchimento')throw new Error('Crie uma nova versão para corrigir.');patch={data:content};}
 else if(action==='finalize'){if(r.status!=='Em preenchimento')throw new Error('Vistoria já finalizada');patch={status:'Finalizado',finalizedAt:stamp()};}
 else if(action==='new-version'){if(r.status==='Em preenchimento')throw new Error('A versão atual ainda está em edição');tx.set(c.ref.collection('versions').doc(String(r.version)),r);patch={version:r.version+1,status:'Em preenchimento',confirmation:{status:'Não enviado'},data:r.data};}
 else if(action==='cancel'){patch={status:'Cancelado'};}
 else if(action==='delete'){patch={deleted:true,deletedAt:stamp(),deletedBy:actor,activeLinkHash:null};if(r.activeLinkHash)tx.set(adminDb.doc('checklistLinks/'+r.activeLinkHash),{revoked:true},{merge:true});}
 else if(action==='link'){
 if(r.status!=='Finalizado'||r.confirmation?.confirmedAt||r.confirmation?.status==='Revisão solicitada')throw new Error('Finalize uma versão ainda não confirmada e sem revisão pendente.');if(!['signature','link','whatsapp'].includes(method))throw new Error('Método inválido');
 const raw=randomBytes(32).toString('hex');const expiresAt=Date.now()+7*86400000;
 tx.set(adminDb.doc('checklistLinks/'+hashToken(raw)),{checklistId:c.ref.id,companyId:r.companyId,version:r.version,method,expiresAt,revoked:false,createdAt:stamp()});
 patch={confirmation:{status:method==='signature'?'Assinatura pendente':'Aguardando confirmação',method},activeLinkHash:hashToken(raw)};extra={token:raw,expiresAt};
 if(r.activeLinkHash)tx.set(adminDb.doc('checklistLinks/'+r.activeLinkHash),{revoked:true},{merge:true});
 }
 else if(action==='revoke'){if(r.activeLinkHash)tx.set(adminDb.doc('checklistLinks/'+r.activeLinkHash),{revoked:true},{merge:true});patch={confirmation:{...r.confirmation,status:r.confirmation?.confirmedAt?r.confirmation.status:'Não enviado'},activeLinkHash:null};}
 else if(action==='pdf'){if(r.status==='Em preenchimento')throw new Error('Finalize antes de gerar o documento');extra={};}
 else if(action==='whatsapp-sent'){if(r.status!=='Finalizado'||r.confirmation?.confirmedAt||r.confirmation?.status==='Revisão solicitada')throw new Error('Crie uma nova versão para resolver a revisão pendente.');patch={confirmation:{status:'Aguardando confirmação',method:'whatsapp',sentAt:stamp(),sentBy:actor,sentVersion:r.version}};}
 else if(action==='whatsapp-confirm'){if(r.confirmation?.method!=='whatsapp'||!r.confirmation.sentAt||r.confirmation.confirmedAt||data?.checked!==true)throw new Error('Confira primeiro a resposta recebida e registre o envio.');patch={confirmation:{...r.confirmation,status:'Ciência registrada via WhatsApp',confirmedAt:stamp(),confirmedBy:actor,version:r.version}};}
 else if(action==='confirm'||action==='sign'){
 if(r.status!=='Finalizado'||r.confirmation?.status==='Revisão solicitada'||r.confirmation?.confirmedAt||data?.accepted!==true||!String(data?.name||'').trim())throw new Error('Leia e aceite a declaração e informe seu nome.');
 if(action==='confirm'&&(!c.public||c.link.method!=='link'))throw new Error('Este link não permite confirmação sem assinatura');
 if(action==='sign'){
 if(c.public&&c.link.method!=='signature')throw new Error('Este link não permite assinatura');
 if(!validId(data.signatureId))throw new Error('Desenhe a assinatura');const m=(await tx.get(adminDb.doc('checklistMedia/'+data.signatureId))).data();
 if(!m||m.checklistId!==c.ref.id||m.version!==r.version||m.kind!=='signature'||m.linkHash!==(c.public?hashToken(token):null))throw new Error('Assinatura inválida');
 }
 patch={confirmation:{...r.confirmation,status:action==='confirm'?'Ciência confirmada por link':c.public?'Confirmado por assinatura remota':'Confirmado por assinatura presencial',method:action==='confirm'?'link':c.public?'signature-remote':'signature-local',confirmedAt:stamp(),confirmedBy:actor,version:r.version,name:String(data.name).slice(0,160),declaration,disclaimer,signatureId:action==='sign'?data.signatureId:null}};
 }
 else if(action==='review'){if(!c.public||r.confirmation?.confirmedAt||!String(data?.description||'').trim())throw new Error('Descreva a divergência');patch={confirmation:{...r.confirmation,status:'Revisão solicitada',review:String(data.description).slice(0,4000),reviewAt:stamp()}};}
 else throw new Error('Ação inválida');
 if(['confirm','sign','whatsapp-confirm'].includes(action)){tx.set(c.ref.collection('versions').doc(String(r.version)),{...r,...patch});}
 if(action==='new-version'&&!String(data?.resolution||'').trim())throw new Error('Registre o motivo da correção/providência adotada.');
 patch.updatedAt=stamp();patch.revision=r.revision+1;tx.update(c.ref,patch);event(tx,c.ref,action,actor,{version:r.version,details:action==='new-version'?String(data.resolution).slice(0,4000):action==='review'?String(data.description).slice(0,4000):'',method:method||''});
 return {id:c.ref.id,...r,...patch,...extra};
 });return res.status(200).json(result);
 }catch(e){return res.status(e.status||400).json({error:e.status===403?'Acesso negado':e.message||'Não foi possível concluir'});}
}
async function validateRelations(companyId,data){for(const [key,col] of [['customerId','customers'],['vehicleId','vehicles'],['quoteId','quotes'],['serviceOrderId','serviceOrders']]){if(!data[key])continue;if(!validId(data[key]))throw new Error('Referência inválida');const s=await adminDb.doc(col+'/'+data[key]).get();if(!s.exists||s.data().companyId!==companyId||s.data().deleted)throw new Error('Cadastro vinculado indisponível');if(key==='vehicleId'&&data.customerId&&s.data().customerId!==data.customerId)throw new Error('Veículo não pertence ao cliente selecionado');}}

async function validateResponsible(companyId,data,tx){
 if(!validId(data.responsibleId))throw new Error('Selecione um mecânico cadastrado como responsável.');
 const ref=adminDb.doc('mechanics/'+data.responsibleId),snap=tx?await tx.get(ref):await ref.get();
 const mechanic=snap.data();
 if(!snap.exists||mechanic.companyId!==companyId||mechanic.deleted||mechanic.status!=='Ativo')throw new Error('Mecânico responsável indisponível. Selecione um mecânico ativo.');
 data.responsible=mechanic.name;
}
