import test from 'node:test';import assert from 'node:assert/strict';import {validateSignature} from '../api/_signature.js';import {png} from './helpers/png.js';
test('servidor rejeita PNG vazio mesmo se o navegador mentir',()=>assert.throws(()=>validateSignature(png(false)),/Desenhe/));
test('servidor aceita traços reais na imagem PNG',()=>assert.equal(validateSignature(png(true)),true));
test('servidor rejeita assinatura malformada e dimensões excessivas',()=>{assert.throws(()=>validateSignature(Buffer.alloc(200)));const p=png(true);p.writeUInt32BE(10000,16);assert.throws(()=>validateSignature(p));});
