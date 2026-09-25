import test from 'node:test';import assert from 'node:assert/strict';import {normalizeWhatsapp} from '../js/utils/masks.js';
test('normaliza whatsapp brasileiro',()=>assert.equal(normalizeWhatsapp('(61) 99999-9999'),'5561999999999'));
test('não repete DDI',()=>assert.equal(normalizeWhatsapp('5561999999999'),'5561999999999'));
