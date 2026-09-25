import test from 'node:test';import assert from 'node:assert/strict';import {calculateItem,calculateQuote} from '../js/utils/currency.js';
test('calcula item com desconto e acréscimo',()=>assert.equal(calculateItem({quantity:2,unitPrice:100,discount:10,addition:5}),195));
test('soma orçamento',()=>assert.equal(calculateQuote([{quantity:2,unitPrice:50},{quantity:1,unitPrice:30,discount:5}]),125));
