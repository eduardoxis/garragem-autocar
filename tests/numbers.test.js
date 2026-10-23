import test from 'node:test';import assert from 'node:assert/strict';
import {formatNumber,parseNumberInput,formatFieldNumber} from '../js/utils/numbers.js';
import {documentHtml} from '../js/modules/checklist/document.js';
import {cleanChecklist} from '../js/utils/checklist.js';
import {checklistRows} from '../js/modules/checklist/list-desktop.js';
import {checklistCards} from '../js/modules/checklist/list-cards.js';
import {createTable} from '../js/components/table.js';
test('números pt-BR preservam zero, negativos, milhares e decimais sem alterar identificadores',()=>{
 assert.equal(formatNumber(1000.5,{decimals:2}),'1.000,50');assert.equal(formatNumber(40000,{decimals:0}),'40.000');assert.equal(formatNumber(0),'0');assert.equal(formatNumber(-1234.5),'-1.234,5');assert.equal(formatNumber(null),'—');
 for(const [input,expected]of [['40.000',40000],['1.000,50',1000.5],['1,25',1.25],['1.5',1.5],['0',0],['-1.000,50',-1000.5]])assert.equal(parseNumberInput(input),expected);
 assert.ok(Number.isNaN(parseNumberInput('1,2,3')));assert.equal(formatFieldNumber('modelYear',2026),2026);assert.equal(formatFieldNumber('plate','ABC1D23'),'ABC1D23');assert.equal(formatFieldNumber('document','00123456789'),'00123456789');assert.equal(formatFieldNumber('quantity',1000.5),'1.000,5');
});
test('quilometragem aparece formatada nas listas e na fonte real do PDF; valores continuam numéricos',()=>{
 const r={id:'abc',version:1,status:'Em preenchimento',confirmation:{status:'Não enviado'},data:cleanChecklist({customerName:'Cliente',brand:'Fiat',model:'Uno',plate:'ABC1234',mileage:40000,keys:1,entryDate:'2026-10-23T10:00',fuelLevel:'0'})};
 for(const html of [documentHtml(r),checklistRows([r]),checklistCards([r])])assert.match(html,/40\.000/);
 assert.equal(r.data.mileage,40000);
 const table=createTable({records:[{quantity:1000,minimumStock:0}],columns:[{key:'quantity',label:'Quantidade'},{key:'minimumStock',label:'Mínimo'}]});assert.match(table,/1\.000/);assert.match(table,/>0<\/td>/);
});
