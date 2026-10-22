import {queueOrder} from './queue.js';
export const workshopZone='America/Sao_Paulo';
export function workshopDay(value=new Date()){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:workshopZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(value));
 const get=type=>parts.find(p=>p.type===type).value;return `${get('year')}-${get('month')}-${get('day')}`;
}
export function validWorkshopDay(day){return /^\d{4}-\d{2}-\d{2}$/.test(day)&&!Number.isNaN(Date.parse(day))&&new Date(day).toISOString().slice(0,10)===day;}
export function serviceDay(record){return record.scheduledDate||record.forecastDate?.slice(0,10)||(record.enteredAt?workshopDay(record.enteredAt):'');}
export function workshopRecords(records,day,today=workshopDay()){
 return records.filter(r=>!r.removed&&(serviceDay(r)===day||(day===today&&r.active&&r.status!=='Pronto'&&serviceDay(r)<today)))
  .sort(queueOrder).map(r=>({id:r.id,revision:r.revision,vehicle:r.vehicle,plate:r.plate,service:r.service,mechanicId:r.mechanicId,mechanicName:r.mechanicName,status:r.status,forecastDate:r.forecastDate,scheduledDate:serviceDay(r),position:r.position,active:r.active,box:r.active&&r.status==='Em serviço'?r.box||'':'',overdue:r.active&&r.status!=='Pronto'&&serviceDay(r)<today}));
}
export function workshopGroups(mechanics,records){
 const groups=mechanics.map(m=>({...m,records:records.filter(r=>r.mechanicId===m.id)}));
 for(const r of records)if(!groups.some(m=>m.id===r.mechanicId))groups.push({id:r.mechanicId,name:r.mechanicName||'Mecânico indisponível',inactive:true,records:records.filter(x=>x.mechanicId===r.mechanicId)});
 return groups;
}
