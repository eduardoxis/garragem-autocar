export const queueStatuses=['Aguardando','Em serviço','Pronto'];
export const queueOrder=(a,b)=>(Number(a.position)||0)-(Number(b.position)||0)||String(a.enteredAt||'').localeCompare(String(b.enteredAt||''))||String(a.id).localeCompare(String(b.id));
// Keep the legacy mechanic field empty so TVs opened before this release can still render safely.
export const publicQueueItem=record=>({id:record.id,vehicle:record.vehicle,service:record.service,mechanic:'',plate:String(record.plate||''),box:record.status==='Em serviço'?String(record.box||''):'',status:record.status,forecast:record.forecastDate||record.forecast||'',position:record.position});
export const queuePages=items=>Array.from({length:Math.max(1,Math.ceil(items.length/20))},(_,i)=>items.slice(i*20,i*20+20));
export const queueTone=status=>status==='Pronto'?'ready':status==='Em serviço'?'working':'waiting';
