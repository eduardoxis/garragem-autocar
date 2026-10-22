import test from 'node:test';
import assert from 'node:assert/strict';
import {workshopDay,validWorkshopDay,serviceDay,workshopRecords,workshopGroups} from '../js/utils/workshop.js';
import {createSidebar} from '../js/components/sidebar.js';
import {cleanWorkshopSchedule,defaultWorkshopSchedule,workshopOpenDay,nextOpenDay} from '../js/utils/workshop-hours.js';
test('dia da oficina usa São Paulo inclusive na virada UTC e valida datas reais',()=>{
 assert.equal(workshopDay('2026-10-23T02:59:59Z'),'2026-10-22');assert.equal(workshopDay('2026-10-23T03:00:00Z'),'2026-10-23');
 assert.equal(validWorkshopDay('2026-02-30'),false);assert.equal(validWorkshopDay('2028-02-29'),true);assert.equal(validWorkshopDay('22/10/2026'),false);
 assert.equal(serviceDay({forecastDate:'2026-10-22T15:00'}),'2026-10-22');
});
test('agenda diária preserva concluídos e pendentes anteriores, sem expor dados privados',()=>{
 const rows=[{id:'today',active:true,scheduledDate:'2026-10-22',status:'Em serviço',box:'1',internalNotes:'privado',position:2},{id:'late',active:true,scheduledDate:'2026-10-21',status:'Aguardando',box:'2',position:1},{id:'done',active:false,scheduledDate:'2026-10-22',status:'Pronto',box:'3'},{id:'removed',removed:true,scheduledDate:'2026-10-22'},{id:'future',active:true,scheduledDate:'2026-10-23'},{id:'old-ready',active:true,scheduledDate:'2026-10-21',status:'Pronto'}];
 const result=workshopRecords(rows,'2026-10-22','2026-10-22');assert.deepEqual(result.map(r=>r.id),['done','late','today']);assert.equal(result.find(r=>r.id==='late').overdue,true);assert.equal(result.find(r=>r.id==='late').box,'');assert.equal(result.find(r=>r.id==='done').box,'');assert.ok(result.every(r=>!('internalNotes'in r)));assert.deepEqual(workshopRecords(rows,'2026-10-23','2026-10-22').map(r=>r.id),['future']);assert.equal(rows[1].status,'Aguardando');
});
test('colunas seguem cadastro ativo e conservam histórico dos profissionais inativos',()=>{
 const groups=workshopGroups([{id:'a',name:'A'},{id:'b',name:'B'}],[{mechanicId:'a',id:'1'},{mechanicId:'old',mechanicName:'Anterior',id:'2'}]);assert.equal(groups.length,3);assert.equal(groups[1].records.length,0);assert.equal(groups[2].inactive,true);
 assert.match(createSidebar({role:'admin'},'gerencia-oficina'),/Gerência Oficina/);assert.match(createSidebar({role:'mecanico'},'gerencia-oficina'),/#gerencia-oficina/);assert.ok(!createSidebar({role:'user'},'clientes').includes('#gerencia-oficina'));
});
test('pendências atravessam sexta, sábado, domingo e feriado sem duplicar ou alterar dados',()=>{
 const schedule=cleanWorkshopSchedule({...defaultWorkshopSchedule(),holidays:[{date:'2026-10-26',name:'Fechado'}]});
 assert.equal(nextOpenDay('2026-10-23',schedule),'2026-10-24');assert.equal(workshopOpenDay('2026-10-25',schedule),false);assert.equal(nextOpenDay('2026-10-24',schedule),'2026-10-27');
 const rows=[{id:'old',active:true,mechanicId:'m1',status:'Em serviço',box:'2',scheduledDate:'2026-10-23',forecastDate:'2026-10-23T17:00',position:1},{id:'new',active:true,status:'Aguardando',scheduledDate:'2026-10-27',position:2}],before=structuredClone(rows);
 for(const day of ['2026-10-24','2026-10-25','2026-10-26','2026-10-27']){const result=workshopRecords(rows,day,day);assert.equal(result.filter(r=>r.id==='old').length,1);assert.equal(result[0].box,'2');assert.equal(result[0].forecastDate,'2026-10-23T17:00');assert.equal(result[0].mechanicId,'m1');}
 assert.deepEqual(rows,before);
});
test('serviço antigo concluído hoje continua visível como Pronto, mas sai das pendências',()=>{
 const row={id:'done',active:true,status:'Pronto',scheduledDate:'2026-10-23',readyAt:'2026-10-27T15:00:00Z'};
 const result=workshopRecords([row],'2026-10-27','2026-10-27');assert.equal(result.length,1);assert.equal(result[0].overdue,false);assert.equal(workshopRecords([row],'2026-10-28','2026-10-28').length,0);
 assert.equal(workshopRecords([{...row,active:false}],'2026-10-27','2026-10-27').length,1);
});
test('expediente rejeita horários e feriados inválidos e permite semana toda fechada',()=>{
 const valid=defaultWorkshopSchedule();assert.throws(()=>cleanWorkshopSchedule({...valid,week:[]}));assert.throws(()=>cleanWorkshopSchedule({...valid,holidays:[{date:'2026-02-30'}]}));assert.throws(()=>cleanWorkshopSchedule({...valid,holidays:[{date:'2026-10-26'},{date:'2026-10-26'}]}));valid.week[1]={open:true,start:'18:00',end:'08:00'};assert.throws(()=>cleanWorkshopSchedule(valid));
 const closed=cleanWorkshopSchedule({...defaultWorkshopSchedule(),week:defaultWorkshopSchedule().week.map(d=>({...d,open:false}))});assert.equal(nextOpenDay('2026-10-23',closed),null);
});
