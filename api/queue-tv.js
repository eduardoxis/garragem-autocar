import {randomBytes} from 'node:crypto';
import {adminDb,requireAdmin} from './_firebase-admin.js';
import {secureResponse,allowSameOrigin,validJsonRequest,rateLimit} from './_security.js';
import {validId} from './_checklist.js';
import {hash,now,fail,tvSession} from './_queue.js';
export default async function handler(req,res){secureResponse(res);
 if(req.method!=='POST'||!allowSameOrigin(req)||!validJsonRequest(req,4096)||!rateLimit(req,{limit:40}))return res.status(400).json({error:'Solicitação inválida'});
 try{if(!adminDb)throw fail('Configure o Firebase Admin no servidor.',503);const {action,code,id,label}=req.body||{};
 if(action==='start'){
  try{const session=await tvSession(req);return res.status(200).json({authorized:session.record.status==='active',code:session.record.status==='pending'?session.record.pairCode:null,label:session.record.label||'Recepção'});}catch{}
  const token=randomBytes(32).toString('hex'),sessionHash=hash(token),pairCode=randomBytes(4).toString('hex').toUpperCase(),expiresAt=new Date(Date.now()+5*60000).toISOString();
  const batch=adminDb.batch();batch.set(adminDb.doc('queueTvSessions/'+sessionHash),{status:'pending',revoked:false,pairCode,agentHash:hash(req.headers['user-agent']||''),companyId:null,createdAt:now(),expiresAt});batch.set(adminDb.doc('queueTvPairCodes/'+hash(pairCode)),{sessionHash,expiresAt});await batch.commit();
  const local=/^(localhost|127\.0\.0\.1)(:|$)/.test(req.headers.host||'');res.setHeader('Set-Cookie','gac_queue_tv='+token+'; Path=/api; HttpOnly; SameSite=Strict; Max-Age=43200'+(local?'':'; Secure'));
  return res.status(200).json({authorized:false,code:pairCode,label:'Recepção'});
 }
 const profile=await requireAdmin(req);
 if(action==='list'){const snapshot=await adminDb.collection('queueTvSessions').where('companyId','==',profile.companyId).get();return res.status(200).json({sessions:snapshot.docs.map(d=>({id:d.id,...d.data()})).filter(r=>r.status==='active'&&!r.revoked&&Date.parse(r.expiresAt)>Date.now()).map(r=>({id:r.id,label:r.label,createdAt:r.authorizedAt,expiresAt:r.expiresAt}))});}
 if(action==='authorize'){
  const normalized=String(code||'').replace(/[^a-f0-9]/gi,'').toUpperCase();if(!/^[A-F0-9]{8}$/.test(normalized))throw fail('Informe o código de 8 caracteres exibido na TV.');
  const pairRef=adminDb.doc('queueTvPairCodes/'+hash(normalized));
  await adminDb.runTransaction(async tx=>{const pair=(await tx.get(pairRef)).data();if(!pair||Date.parse(pair.expiresAt)<=Date.now())throw fail('Código expirado. Gere um novo código na TV.');const sessionRef=adminDb.doc('queueTvSessions/'+pair.sessionHash),session=(await tx.get(sessionRef)).data();if(!session||session.status!=='pending'||session.revoked||Date.parse(session.expiresAt)<=Date.now())throw fail('Código indisponível');tx.update(sessionRef,{status:'active',companyId:profile.companyId,label:String(label||'Recepção').trim().slice(0,40)||'Recepção',authorizedAt:now(),authorizedBy:profile.uid,expiresAt:new Date(Date.now()+12*3600000).toISOString()});tx.delete(pairRef);tx.set(adminDb.collection('queueAudit').doc(),{companyId:profile.companyId,action:'TV autorizada',at:now(),actorId:profile.uid,actor:profile.name||profile.uid,sessionId:sessionRef.id});});return res.status(200).json({ok:true});
 }
 if(action==='revoke'){if(!validId(id))throw fail('Sessão inválida');const ref=adminDb.doc('queueTvSessions/'+id);await adminDb.runTransaction(async tx=>{const session=(await tx.get(ref)).data();if(!session||session.companyId!==profile.companyId)throw fail('Sessão indisponível',403);tx.update(ref,{revoked:true,revokedAt:now(),revokedBy:profile.uid});tx.set(adminDb.collection('queueAudit').doc(),{companyId:profile.companyId,action:'TV revogada',at:now(),actorId:profile.uid,actor:profile.name||profile.uid,sessionId:id});});return res.status(200).json({ok:true});}
 throw fail('Ação inválida');
 }catch(error){return res.status(error.status||400).json({error:error.message||'Não foi possível autorizar a TV.'});}
}
