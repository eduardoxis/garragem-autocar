import {adminDb} from './_firebase-admin.js';
export const EDIT_LEASE_MS=90000;
export const validEditSession=value=>typeof value==='string'&&/^[a-zA-Z0-9_-]{16,100}$/.test(value);
const conflict=message=>Object.assign(new Error(message),{status:409});
export const editRef=id=>adminDb.doc('checklists/'+id+'/editing/session');
export function newEditLease(profile,session){if(!validEditSession(session))throw conflict('Atualize a página antes de editar este checklist.');return {companyId:profile.companyId,uid:profile.uid,session,expiresAt:Date.now()+EDIT_LEASE_MS};}
export async function assertEditLease(tx,id,profile,session,{required=false}={}){
 const lock=(await tx.get(editRef(id))).data(),active=lock&&lock.expiresAt>Date.now();
 if(active&&(lock.companyId!==profile.companyId||lock.uid!==profile.uid||lock.session!==session))throw conflict('Este checklist está sendo editado por outra pessoa. Aguarde ela sair da edição.');
 if(required&&(!active||!validEditSession(session)))throw conflict('Sua sessão de edição expirou. Reabra o checklist antes de salvar.');
 return lock;
}
export async function manageEditLease(context,action,session){
 if(context.public)throw Object.assign(new Error('Acesso negado'),{status:403});
 if(!validEditSession(session))throw conflict('Sessão de edição inválida.');
 return adminDb.runTransaction(async tx=>{
  const record=(await tx.get(context.ref)).data();if(!record||record.deleted||record.companyId!==context.profile.companyId)throw Object.assign(new Error('Acesso negado'),{status:403});
  const ref=editRef(context.ref.id),lock=(await tx.get(ref)).data(),mine=lock?.uid===context.profile.uid&&lock?.session===session&&lock?.companyId===context.profile.companyId;
  if(action==='release-edit'){if(mine)tx.delete(ref);return {released:true};}
  if(record.status!=='Em preenchimento')throw conflict('Este checklist não está mais em preenchimento.');
  if(lock?.expiresAt>Date.now()&&!mine)throw conflict('Este checklist está sendo editado por outra pessoa. Aguarde ela sair da edição.');
  if(action==='renew-edit'&&(!mine||lock.expiresAt<=Date.now()))throw conflict('Sua sessão de edição expirou. Reabra o checklist.');
  const next=newEditLease(context.profile,session);tx.set(ref,next);return {expiresAt:next.expiresAt};
 });
}
