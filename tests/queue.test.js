import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {publicQueueItem,queuePages,queueOrder} from '../js/utils/queue.js';
import {createSidebar,createMobileNav} from '../js/components/sidebar.js';
test('painel público contém somente campos necessários e pagina 20 em 20',()=>{
 const projected=publicQueueItem({id:'entry',vehicle:'Onix',service:'Óleo',mechanicName:'Carlos Eduardo',status:'Pronto',forecastDate:'2026-10-22T15:00',position:1,enteredAt:'2026-10-22T10:00',plate:'ABC1234',customerName:'Privado',internalNotes:'Segredo',companyId:'tenant'});
 assert.deepEqual(Object.keys(projected).sort(),['id','vehicle','service','mechanic','plate','box','status','forecast','position'].sort());assert.equal(projected.plate,'ABC1234');assert.equal(projected.box,'');assert.equal(projected.mechanic,'');assert.equal(projected.mechanic.length,0,'TVs antigas podem ler o campo sem falhar');assert.equal(queuePages(Array.from({length:21},(_,i)=>i)).length,2);assert.equal(queuePages(Array.from({length:20},(_,i)=>i))[0].length,20);assert.equal(queuePages([]).length,1);
});
test('menu da fila aparece apenas para equipe autorizada, inclusive no celular',()=>{
 assert.match(createSidebar({role:'admin'},'fila'),/Gerenciar Fila/);assert.match(createSidebar({role:'mecanico'},'fila'),/#fila/);assert.match(createMobileNav({role:'mecanico'},'fila'),/#fila/);assert.ok(!createSidebar({role:'user'},'clientes').includes('#fila'));assert.ok(!createSidebar({role:'atendente'},'clientes').includes('#fila'));
});
test('rota da TV é documento independente, sem shell, Firebase do funcionário ou links de gerenciamento',()=>{
 const html=readFileSync(new URL('../fila/tv.html',import.meta.url),'utf8');assert.ok(!html.includes('onepage.js'));assert.ok(!html.includes('sidebar'));assert.ok(!html.includes('#fila'));assert.ok(!html.includes('firebase-config'));assert.match(html,/queue-tv.css/);
 const config=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));assert.equal(config.cleanUrls,true);assert.equal(config.functions['api/queue-stream.js'].maxDuration,60);
});
test('ordem da fila é estável e independente de status',()=>{
 const rows=[{id:'b',position:2,status:'Pronto'},{id:'a',position:1,status:'Aguardando'}].sort(queueOrder);assert.equal(rows[0].id,'a');
});
