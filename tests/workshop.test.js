import test from 'node:test';
import assert from 'node:assert/strict';
import {workshopDay,validWorkshopDay,serviceDay,workshopRecords,workshopGroups} from '../js/utils/workshop.js';
import {createSidebar} from '../js/components/sidebar.js';
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
