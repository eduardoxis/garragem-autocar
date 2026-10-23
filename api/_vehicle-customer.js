import {adminDb,requireStaff} from './_firebase-admin.js';
import {validId} from './_checklist.js';
export async function linkVehicleCustomer(req){
 const profile=await requireStaff(req,['admin','atendente','mecanico']),data=req.body.data||{};
 if(!validId(data.vehicleId)||!validId(data.customerId))throw new Error('Selecione um cliente e um veículo cadastrados.');
 return adminDb.runTransaction(async tx=>{
  const vehicleRef=adminDb.doc('vehicles/'+data.vehicleId),vehicle=(await tx.get(vehicleRef)).data(),customer=(await tx.get(adminDb.doc('customers/'+data.customerId))).data();
  if(!vehicle||vehicle.deleted||vehicle.companyId!==profile.companyId||!customer||customer.deleted||customer.companyId!==profile.companyId)throw Object.assign(new Error('Cadastro indisponível.'),{status:403});
  if((vehicle.customerId||'')!==(data.expectedCustomerId||''))throw Object.assign(new Error('O vínculo do veículo foi alterado. Atualize a lista antes de continuar.'),{status:409});
  const patch={customerId:data.customerId,ownerName:customer.name||customer.email||'Cliente',updatedAt:new Date().toISOString()};tx.update(vehicleRef,patch);
  tx.set(adminDb.collection('auditLogs').doc(),{companyId:profile.companyId,userId:profile.uid,userName:profile.name||'',action:'vehicle_customer_link',module:'vehicles',recordId:data.vehicleId,oldValue:JSON.stringify({customerId:vehicle.customerId||'',ownerName:vehicle.ownerName||''}),newValue:JSON.stringify(patch),deleted:false,createdAt:new Date().toISOString()});
  return {id:data.vehicleId,...vehicle,...patch};
 });
}
