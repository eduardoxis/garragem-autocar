import test from 'node:test';import assert from 'node:assert/strict';import {formatCurrencyInput,maskCep,maskCpfCnpj,maskPhone,normalizeWhatsapp,parseCurrencyInput} from '../js/utils/masks.js';
test('normaliza whatsapp brasileiro',()=>assert.equal(normalizeWhatsapp('(61) 99999-9999'),'5561999999999'));
test('não repete DDI',()=>assert.equal(normalizeWhatsapp('5561999999999'),'5561999999999'));
test('formata CPF e CNPJ',()=>{assert.equal(maskCpfCnpj('12345678901'),'123.456.789-01');assert.equal(maskCpfCnpj('12345678000199'),'12.345.678/0001-99');});
test('formata telefone e CEP',()=>{assert.equal(maskPhone('61999999999'),'(61) 99999-9999');assert.equal(maskCep('72800000'),'72800-000');});
test('formata e converte moeda brasileira',()=>{assert.equal(formatCurrencyInput(2500),'2.500,00');assert.equal(formatCurrencyInput('2500.5'),'2.500,50');assert.equal(parseCurrencyInput('2.500,00'),2500);});
