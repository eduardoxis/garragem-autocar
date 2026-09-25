import { adminAuth, adminDb, FieldValue, requireAdmin } from '../_firebase-admin.js';
import { allowSameOrigin, rateLimit, secureResponse, validJsonRequest } from '../_security.js';

export default async function handler(req,res){
  secureResponse(res);
  if(req.method!=='POST')return res.status(405).json({error:'Método não permitido'});
  if(!allowSameOrigin(req))return res.status(403).json({error:'Origem não permitida'});
  if(!validJsonRequest(req)||!rateLimit(req,{limit:10}))return res.status(429).json({error:'Solicitação não permitida'});
  try{
    const current=await requireAdmin(req);
    const {name,email,password,role,companyId}=req.body||{};
    const safeName=String(name||'').trim().slice(0,120);
    const safeEmail=String(email||'').trim().toLowerCase().slice(0,254);
    if(!safeName||!/^\S+@\S+\.\S+$/.test(safeEmail)||String(password||'').length<8||String(password||'').length>128||!['admin','user'].includes(role)||companyId!==current.companyId)return res.status(400).json({error:'Dados inválidos'});
    const created=await adminAuth.createUser({displayName:safeName,email:safeEmail,password});
    await adminDb.doc(`users/${created.uid}`).set({name:safeName,email:safeEmail,role,active:true,companyId,deleted:false,createdAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()});
    return res.status(201).json({uid:created.uid});
  }catch(error){
    console.error('admin/users',error);
    return res.status(error.status||500).json({error:error.status?'Acesso não autorizado':'Não foi possível criar o usuário'});
  }
}
