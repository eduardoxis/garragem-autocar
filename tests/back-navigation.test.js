import test from 'node:test';
import assert from 'node:assert/strict';
import { rememberRoute, previousRoute, homeRoute, goBack } from '../js/utils/back-navigation.js';

test('seta retorna pelas áreas internas e usa início autorizado em acesso direto', () => {
  rememberRoute('#dashboard');rememberRoute('#clientes');rememberRoute('#checklist');
  assert.equal(previousRoute('#dashboard'),'#clientes');
  rememberRoute('#clientes');assert.equal(previousRoute('#dashboard'),'#dashboard');
  assert.equal(previousRoute('#dashboard'),'#dashboard');
  assert.equal(homeRoute('mecanico'),'#fila');assert.equal(homeRoute('financeiro'),'#financeiro');assert.equal(homeRoute('atendente'),'#clientes');
});

test('voltar prioriza a ação da tela atual e respeita botões desabilitados', () => {
  let clicks=0;const local={disabled:false,click:()=>clicks++};const root={querySelector:()=>local};
  goBack(root,'#dashboard');assert.equal(clicks,1);local.disabled=true;goBack(root,'#dashboard');assert.equal(clicks,1);
});
