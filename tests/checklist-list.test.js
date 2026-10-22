import test from 'node:test';
import assert from 'node:assert/strict';
import { filterChecklists, checklistPage } from '../js/utils/checklist-list.js';
import { checklistRows, checklistSummary } from '../js/modules/checklist/list-desktop.js';

const records = Array.from({ length: 28 }, (_, i) => ({ id: 'id' + i, code: 'CHK-' + i, version: 2, status: i % 2 ? 'Finalizado' : 'Em preenchimento', confirmation: { status: i === 0 ? 'Revisão solicitada' : 'Não enviado' }, data: { customerName: i === 0 ? 'Carlos' : 'Maria', plate: 'ABC' + i, responsible: i === 0 ? 'João' : 'Ana', brand: 'Honda', model: 'Civic', entryDate: '2026-10-' + String(i % 2 ? 21 : 22) + 'T10:00', mileage: 15 } }));

test('filtros combinados usam cliente, placa, funcionário, datas e ciência', () => {
  assert.equal(filterChecklists(records, { search: 'carlos', employee: 'joÃO', from: '2026-10-22', to: '2026-10-22', status: 'Revisão solicitada' }).length, 1);
  assert.equal(filterChecklists(records, { search: 'ABC0', to: '2026-10-21' }).length, 0);
  assert.equal(filterChecklists(records, { status: 'Finalizado' }).length, 14);
});

test('paginação preserva todos os registros, limita a última página e trata lista vazia', () => {
  assert.deepEqual([1, 2, 3].flatMap(page => checklistPage(records, page, 10).records), records);
  assert.equal(checklistPage(records.slice(0, 20), 3, 10).current, 2);
  assert.equal(checklistPage(records, 2, 25).records.length, 3);
  assert.equal(checklistPage([], 4, 10).start, 0);
});

test('tabela mantém segurança, ações permitidas e resumo dos registros filtrados', () => {
  const rows = checklistRows([{ ...records[0], data: { ...records[0].data, customerName: '<script>bad()</script>' } }], { canDelete: true });
  assert.ok(!rows.includes('<script>'));assert.match(rows, /&lt;script&gt;/);assert.match(rows, /data-checklist-action="delete"/);assert.match(rows, /data-open="id0"/);
  assert.ok(!checklistRows(records, { canDelete: false }).includes('data-checklist-action="delete"'));
  assert.match(checklistSummary(records), /<strong>28<\/strong>/);assert.match(checklistSummary(records), /<strong>14<\/strong>/);assert.match(checklistSummary(records), /<strong>1<\/strong>/);
});
