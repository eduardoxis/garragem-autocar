import {createHash} from 'node:crypto';
import {adminDb,requireStaff} from './_firebase-admin.js';
import {validId} from './_checklist.js';
import {publicQueueItem,queueOrder} from '../js/utils/queue.js';
export const hash=value=>createHash('sha256').update(String(value)).digest('hex');
export const now=()=>new Date().toISOString();
export const fail=(message,status=400)=>Object.assign(new Error(message),{status});
export async function queueProfile(req){
 const profile=await requireStaff(req,['admin','mecanico']);
 if(profile.role==='mecanico'){
  if(!validId(profile.mechanicId))throw fail('Seu usuário precisa estar vinculado a um mecânico ativo na Administração.',403);
  const mechanic=(await adminDb.doc('mechanics/'+profile.mechanicId).get()).data();
  if(!mechanic||mechanic.companyId!==profile.companyId||mechanic.deleted||mechanic.status!=='Ativo'||mechanic.userId!==profile.uid)throw fail('Vínculo do mecânico indisponível. Fale com o administrador.',403);
 }
 return profile;
}
export const requireQueueAdmin=profile=>{if(profile.role!=='admin')throw fail('Apenas o administrador pode realizar esta ação.',403);};
export function ownQueue(record,profile){if(!record||record.companyId!==profile.companyId||(profile.role==='mecanico'&&record.mechanicId!==profile.mechanicId))throw fail('Atendimento indisponível.',403);}
export const queueRecords=snapshot=>snapshot.docs.map(doc=>({id:doc.id,...doc.data()})).filter(r=>r.active&&!r.removed).sort(queueOrder);
export const tvRecords=snapshot=>queueRecords(snapshot).map(publicQueueItem);
export function writeQueue(tx,ref,record,old,profile,action){
 const at=now();const next={...record,updatedAt:at,updatedBy:profile.uid,revision:(old?.revision||0)+1};
 tx.set(ref,next);
 const display=adminDb.doc('queueDisplayEntries/'+ref.id);
 if(next.active&&!next.removed)tx.set(display,{...publicQueueItem({id:ref.id,...next}),companyId:next.companyId});else tx.delete(display);
 const event={companyId:next.companyId,entryId:ref.id,at,action,actorId:profile.uid,actor:profile.name||profile.email||profile.uid,before:old||null,after:next};
 tx.set(ref.collection('history').doc(),event);tx.set(adminDb.collection('queueAudit').doc(),event);
 return {id:ref.id,...next};
}
export function queueCookie(req){const match=String(req.headers.cookie||'').match(/(?:^|;\s*)gac_queue_tv=([a-f0-9]{64})(?:;|$)/);return match?.[1]||null;}
export async function tvSession(req){const token=queueCookie(req);if(!token)throw fail('TV não autorizada.',401);const ref=adminDb.doc('queueTvSessions/'+hash(token));const record=(await ref.get()).data();if(!record||record.revoked||Date.parse(record.expiresAt)<=Date.now()||record.agentHash!==hash(req.headers['user-agent']||''))throw fail('Autorização da TV expirada ou revogada.',401);return {ref,record};}
