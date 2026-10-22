import {validWorkshopDay} from './workshop.js';
export const defaultWorkshopSchedule=()=>({configured:false,week:Array.from({length:7},(_,i)=>({open:i!==0,start:'08:00',end:i===6?'12:00':'18:00'})),holidays:[]});
export function cleanWorkshopSchedule(value){
 if(!value||!Array.isArray(value.week)||value.week.length!==7||!Array.isArray(value.holidays)||value.holidays.length>366)throw new Error('Informe os sete dias da semana e até 366 feriados.');
 const time=v=>typeof v==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(v);
 const week=value.week.map(d=>{if(!d||typeof d.open!=='boolean'||!time(d.start)||!time(d.end)||(d.open&&d.start>=d.end))throw new Error('Informe horários válidos; a abertura deve ser anterior ao fechamento.');return {open:d.open,start:d.start,end:d.end};});
 const seen=new Set(),holidays=value.holidays.map(h=>{if(!h||!validWorkshopDay(h.date)||seen.has(h.date))throw new Error('Informe feriados com datas válidas, sem repetição.');seen.add(h.date);return {date:h.date,name:String(h.name||'Feriado').trim().slice(0,80)||'Feriado'};}).sort((a,b)=>a.date.localeCompare(b.date));
 return {configured:true,week,holidays};
}
export function workshopSchedule(value){try{return cleanWorkshopSchedule(value);}catch{return defaultWorkshopSchedule();}}
export function nextCalendarDay(day){const d=new Date(day+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+1);return d.toISOString().slice(0,10);}
export function workshopOpenDay(day,schedule){return Boolean(schedule.week[new Date(day+'T12:00:00Z').getUTCDay()]?.open)&&!schedule.holidays.some(h=>h.date===day);}
export function nextOpenDay(day,schedule){let next=day;for(let i=0;i<740;i++){next=nextCalendarDay(next);if(workshopOpenDay(next,schedule))return next;}return null;}
export function workshopHoursMessage(day,schedule){
 if(!schedule.configured)return 'Expediente ainda não configurado. Ajuste os dias, horários e feriados nas configurações.';
 if(!workshopOpenDay(day,schedule)){const next=nextOpenDay(day,schedule),holiday=schedule.holidays.find(h=>h.date===day);return `${holiday?holiday.name:'Oficina fechada neste dia'}. ${next?'Próximo expediente: '+next.split('-').reverse().join('/')+'.':'Nenhum próximo expediente configurado.'} Os serviços pendentes permanecem ativos.`;}
 const hours=schedule.week[new Date(day+'T12:00:00Z').getUTCDay()];return `Expediente: ${hours.start} às ${hours.end}. Pendências e boxes são preservados após o fechamento.`;
}
