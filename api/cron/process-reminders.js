import { adminDb, FieldValue } from '../_firebase-admin.js';
import { safeSecretEqual, secureResponse } from '../_security.js';

export default async function handler(req,res){
  secureResponse(res);
  if(req.method!=='GET')return res.status(405).json({error:'Método não permitido'});
  const token=req.headers.authorization?.replace(/^Bearer\s+/,'');
  if(!safeSecretEqual(token,process.env.CRON_SECRET))return res.status(401).json({error:'Não autorizado'});
  const now=new Date();
  const snapshot=await adminDb.collection('reminders').where('status','==','pending').where('scheduledAt','<=',now).limit(500).get();
  let processed=0;
  for(const reminder of snapshot.docs){
    const data=reminder.data();const notification=adminDb.collection('notifications').doc();const batch=adminDb.batch();
    batch.set(notification,{companyId:data.companyId,userId:data.userId||null,type:data.type,title:'Follow-up de orçamento pendente',message:`Entrar em contato com ${data.customerName||'o cliente'}.`,recordId:data.quoteId,status:'unread',deleted:false,createdAt:FieldValue.serverTimestamp()});
    batch.update(reminder.ref,{status:'notified',notifiedAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()});
    await batch.commit();processed+=1;
  }
  return res.status(200).json({processed});
}
