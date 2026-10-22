export const queueStatuses=['Aguardando','Em serviço','Pronto'];
export const queueOrder=(a,b)=>(Number(a.position)||0)-(Number(b.position)||0)||String(a.enteredAt||'').localeCompare(String(b.enteredAt||''))||String(a.id).localeCompare(String(b.id));
export const publicQueueItem=record=>({id:record.id,vehicle:record.vehicle,service:record.service,mechanic:String(record.mechanicName||record.mechanic||'').trim().split(/\s+/)[0].slice(0,30),status:record.status,forecast:record.forecastDate||record.forecast||'',position:record.position});
export const queuePages=items=>Array.from({length:Math.max(1,Math.ceil(items.length/20))},(_,i)=>items.slice(i*20,i*20+20));
export const queueTone=status=>status==='Pronto'?'ready':status==='Em serviço'?'working':'waiting';
