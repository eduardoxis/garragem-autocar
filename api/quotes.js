import { adminDb, FieldValue, requireStaff } from './_firebase-admin.js';
import { allowSameOrigin, secureResponse, validJsonRequest, rateLimit } from './_security.js';
import { quoteBreakdown, paymentRule } from '../js/utils/discounts.js';
export default async function handler(req,res) {
 secureResponse(res);
 if(req.method!=='POST')return res.status(405).json({error:'Método não permitido'});
 if(!allowSameOrigin(req)||!validJsonRequest(req,250000)||!rateLimit(req))return res.status(400).json({error:'Solicitação inválida'});
 try {
 const p=await requireStaff(req,['admin','atendente','user']);const {id,data,action}=req.body||{};
 if(id && !/^[a-zA-Z0-9_-]{1,120}$/.test(id))throw new Error('Identificador inválido.');
 const ref=id?adminDb.doc('quotes/'+id):adminDb.collection('quotes').doc();
 const result=await adminDb.runTransaction(async tx=>{
 const existing=id?await tx.get(ref):null;
 if(id&&(!existing.exists||existing.data().companyId!==p.companyId))throw Object.assign(new Error('Acesso negado'),{status:403});
 if(action==='delete'){tx.update(ref,{deleted:true,deletedBy:p.uid,deletedAt:FieldValue.serverTimestamp()});return {id:ref.id};}
 if(action==='followup'){
 if(!id||!data)throw new Error('Registro inválido');const patch={};for(const key of ['status','whatsapp','followUpStep','nextFollowUpAt'])if(data[key]!==undefined)patch[key]=data[key];tx.update(ref,{...patch,updatedAt:FieldValue.serverTimestamp()});return {id:ref.id};
 }
 if(!data || !String(data.customerName||'').trim() || !data.items?.length)throw new Error('Informe cliente e itens.');
 const settings=(await tx.get(adminDb.doc('companies/'+p.companyId))).data()||{};
 const previous=existing?.data();
 const method=data.paymentMethod||'';
 // Keep the rule agreed on the saved quote unless the payment method changes.
 const rule=previous?.calculationVersion===2 && previous.paymentMethod===method ? previous.paymentDiscount : paymentRule(settings,method);
 const safe={};for(const key of ['customerName','customerId','customerType','document','whatsapp','email','phone','vehicle','vehicleId','plate','mileage','terms','status','validUntil','generalDiscount','generalDiscountType','paymentMethod'])if(data[key]!==undefined)safe[key]=data[key];
 safe.items=data.items.map(i=>Object.fromEntries(['type','description','brand','unit','quantity','unitPrice','discount','discountType','addition'].filter(k=>i[k]!==undefined).map(k=>[k,i[k]])));
 const totals=quoteBreakdown(safe.items,{...safe,paymentDiscount:rule});
 safe.paymentDiscount=rule||{enabled:false,type:'fixed',value:0};safe.totals=totals;safe.total=totals.total/100;safe.calculationVersion=2;
 safe.code=previous?.code||'ORC-'+ref.id.slice(0,8).toUpperCase();safe.companyId=p.companyId;safe.updatedAt=FieldValue.serverTimestamp();safe.userId=p.uid;safe.userName=p.name||'';
 if(action==='preview'){return {id:id||null,total:safe.total,totals,paymentDiscount:safe.paymentDiscount,quote:{...safe,code:id?safe.code:'PRÉVIA',updatedAt:null,createdAt:previous?.createdAt?.toDate?.().toISOString()||new Date().toISOString()}};}
 if(id)tx.update(ref,safe);else{
 const reminder=adminDb.collection('reminders').doc();const due=new Date(Date.now()+Math.max(1,Number(settings.followUpDays)||1)*86400000);
 tx.set(ref,{...safe,deleted:false,createdAt:FieldValue.serverTimestamp(),followUpStep:0,nextFollowUpAt:due,reminderId:reminder.id});
 tx.set(reminder,{companyId:p.companyId,type:'quote_follow_up',step:1,quoteId:ref.id,customerName:safe.customerName,whatsapp:safe.whatsapp||'',scheduledAt:due,status:'pending',deleted:false,createdAt:FieldValue.serverTimestamp()});
 }
 return {id:ref.id,total:safe.total,totals};
 });return res.status(200).json(result);
 }catch(e){return res.status(e.status||400).json({error:e.status===403?'Acesso negado':e.message||'Falha ao salvar orçamento'});}
}
