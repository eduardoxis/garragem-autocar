import test from 'node:test';import assert from 'node:assert/strict';import {nextDayAt} from '../js/utils/date.js';
test('agenda primeiro follow-up no dia seguinte',()=>{const result=nextDayAt(new Date('2026-09-25T15:00:00-03:00'),9);assert.equal(result.getDate(),26);assert.equal(result.getHours(),9);});
