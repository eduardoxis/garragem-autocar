import test from 'node:test';import assert from 'node:assert/strict';import {nextDayAt,formatDateTime} from '../js/utils/date.js';
test('agenda primeiro follow-up no dia seguinte',()=>{const result=nextDayAt(new Date('2026-09-25T15:00:00-03:00'),9);assert.equal(result.getDate(),26);assert.equal(result.getHours(),9);});

test('data e hora brasileiras mantêm horário de entrada e convertem timestamp do servidor',()=>{assert.equal(formatDateTime('2026-10-22T14:30'),'22/10/2026 às 14:30');assert.equal(formatDateTime('2026-10-22T17:30:00.000Z'),'22/10/2026 às 14:30');assert.equal(formatDateTime('2026-10-23T01:15:00Z'),'22/10/2026 às 22:15');assert.equal(formatDateTime(null),'—');assert.equal(formatDateTime('inválida'),'—');});
