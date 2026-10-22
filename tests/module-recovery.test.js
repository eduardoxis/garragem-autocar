import test from 'node:test';
import assert from 'node:assert/strict';
import { isModuleVersionError, recoverModuleVersion } from '../js/utils/module-recovery.js';

test('atualização limpa módulos antigos uma vez e impede recarga em ciclo', () => {
  const values = new Map();
  const storage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) };
  const error = new SyntaxError("The requested module '../../utils/checklist.js' does not provide an export named 'checklistDescription'");
  let reloads = 0;
  const options = { storage, now: 1000000, reload: () => reloads++ };
  assert.equal(isModuleVersionError(error), true);
  assert.equal(recoverModuleVersion(error, options), true);
  assert.equal(recoverModuleVersion(error, { ...options, now: 1001000 }), false);
  assert.equal(reloads, 1);
  assert.equal(recoverModuleVersion(new Error('Acesso negado'), options), false);
  assert.equal(recoverModuleVersion(error, { ...options, now: 1120000 }), true);
});

test('falha de armazenamento mantém recuperação manual sem outro erro', () => {
  const storage = { getItem() { throw new Error('Blocked'); } };
  assert.equal(recoverModuleVersion(new SyntaxError('does not provide an export named x'), { storage }), false);
});
