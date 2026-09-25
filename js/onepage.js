import { openAdminPanel } from './modules/administracao/modal.js';

const routes = {
  dashboard: ['Dashboard', './modules/dashboard/page.js'],
  clientes: ['Clientes', './modules/clientes/page.js'],
  veiculos: ['Veículos', './modules/veiculos/page.js'],
  orcamentos: ['Orçamentos', './modules/orcamentos/page.js'],
  oficina: ['Oficina', './modules/oficina/page.js'],
  'ordens-servico': ['Ordens de Serviço', './modules/os/page.js'],
  agenda: ['Agenda', './modules/agenda/page.js'],
  estoque: ['Estoque', './modules/estoque/page.js'],
  servicos: ['Serviços', './modules/servicos/page.js'],
  fornecedores: ['Fornecedores', './modules/fornecedores/page.js'],
  'cotacoes-fornecedores': ['Cotações de fornecedores', './modules/cotacoes-fornecedores/page.js'],
  financeiro: ['Financeiro', './modules/financeiro/page.js'],
  caixa: ['Caixa', './modules/caixa/page.js'],
  'contas-pagar': ['Contas a pagar', './modules/contas-pagar/page.js'],
  'contas-receber': ['Contas a receber', './modules/contas-receber/page.js'],
  'pos-venda': ['Pós-venda', './modules/pos-venda/page.js'],
  relatorios: ['Relatórios', './modules/relatorios/page.js'],
  lembretes: ['Lembretes', './modules/lembretes/page.js'],
  importacao: ['Importação', './modules/importacao/page.js'],
  auditoria: ['Auditoria', './modules/auditoria/page.js'],
  configuracoes: ['Configurações', './modules/configuracoes/page.js'],
  'check-in': ['Check-in', './modules/check-in/page.js'],
  perfil: ['Perfil', './modules/perfil/page.js']
};

let navigationId = 0;

export function currentRoute() {
  const raw = location.hash.slice(1) || 'dashboard';
  const [name, query = ''] = raw.split('?');
  return { name: routes[name] ? name : 'dashboard', query };
}

export function routeHref(name, query = '') {
  return `#${routes[name] ? name : 'dashboard'}${query ? `?${query}` : ''}`;
}

async function loadRoute() {
  const id = ++navigationId;
  const route = currentRoute();
  const [title, modulePath] = routes[route.name];
  document.body.dataset.module = route.name;
  document.title = `${title} | Garagem Auto Car`;
  document.querySelector('#app').innerHTML = '<main class="route-loading"><span class="route-spinner" aria-hidden="true"></span><p>Carregando...</p></main>';

  try {
    await import(`${modulePath}?route=${id}`);
  } catch (error) {
    console.error(error);
    if (id !== navigationId) return;
    document.querySelector('#app').innerHTML = '<main class="route-error"><img src="assets/garagem-auto-car-logo.png" alt="Garagem Auto Car"><h1>Não foi possível abrir esta área</h1><p>Tente novamente. Se o problema continuar, entre novamente no sistema.</p><button class="btn btn-primary" id="retry-route">Tentar novamente</button></main>';
    document.querySelector('#retry-route')?.addEventListener('click', loadRoute);
  }
}

document.addEventListener('click', event => {
  const link = event.target.closest('a[href]');
  if (!link || link.target === '_blank' || link.hasAttribute('download') || link.dataset.action === 'logout') return;
  const href = link.getAttribute('href');
  if (href === '#administracao') { event.preventDefault(); openAdminPanel(); return; }
  const route = href?.startsWith('#') && routes[href.slice(1).split('?')[0]] ? href : null;
  if (!route) return;
  event.preventDefault();
  if (location.hash === route) loadRoute();
  else location.hash = route;
});

window.addEventListener('hashchange', loadRoute);
if (!location.hash) history.replaceState(null, '', `${location.pathname}#dashboard`);
loadRoute();
