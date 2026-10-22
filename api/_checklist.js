import { createHash } from 'node:crypto';
import { adminDb, requireStaff } from './_firebase-admin.js';
import { canRespond } from '../js/utils/checklist.js';
export const hashToken=t=>createHash('sha256').update(t).digest('hex');
export const validId=id=>typeof id==='string'&&/^[a-zA-Z0-9_-]{1,120}$/.test(id);
export async function context(req, id, token){
 if(!adminDb)throw Object.assign(new Error('Configure as credenciais Firebase Admin no servidor.'),{status:503});
 if(token){if(!/^[a-f0-9]{64}$/.test(token))throw new Error('Link inválido.');const linkRef=adminDb.doc('checklistLinks/'+hashToken(token));const link=(await linkRef.get()).data();if(!link)throw new Error('Link inválido.');const ref=adminDb.doc('checklists/'+link.checklistId);const record=(await ref.get()).data();if(!record||record.deleted)throw new Error('Checklist indisponível.');canRespond(record,link);return {ref,record,link,linkRef,public:true};}
 const profile=await requireStaff(req,['admin','atendente','mecanico']);if(!validId(id))throw new Error('Identificador inválido.');const ref=adminDb.doc('checklists/'+id);const record=(await ref.get()).data();if(!record||record.deleted||record.companyId!==profile.companyId)throw Object.assign(new Error('Acesso negado'),{status:403});return {ref,record,profile,public:false};
}
