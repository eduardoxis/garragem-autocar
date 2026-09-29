import { getIcon } from './icons.js';

const adminItems = [
  ['dashboard','Dashboard','#dashboard'], ['users','Clientes','#clientes'], ['car','Veículos','#veiculos'],
  ['file','Orçamentos','#orcamentos'], ['file','Ordens de Serviço','#ordens-servico'], ['wrench','Oficina','#oficina'],
  ['calendar','Agenda','#agenda'], ['box','Estoque','#estoque'], ['truck','Fornecedores','#fornecedores'],
  ['money','Financeiro','#financeiro'], ['clock','Pós-venda','#pos-venda'], ['chart','Relatórios','#relatorios'],
  ['users','Administração','#administracao'], ['settings','Configurações','#configuracoes']
];
const userItems = [['users','Clientes','#clientes'],['file','Orçamentos','#orcamentos'],['settings','Perfil','#perfil']];
const routeName = url => url.replace(/^#/,'').split('?')[0];

export function createSidebar(profile, active) {
  const items = profile.role === 'admin' ? adminItems : userItems;
  return `<aside class="sidebar">
    <a class="sidebar-brand" href="${profile.role === 'admin' ? '#dashboard' : '#clientes'}"><img class="brand-logo" src="assets/garagem-auto-car-logo.png" alt="Garagem Auto Car"><span><strong>GARAGEM AUTO CAR</strong><small>GESTÃO DE OFICINA</small></span></a>
    <nav class="sidebar-nav" aria-label="Menu principal">${items.map(([icon,label,url]) => `<a class="nav-link ${active === routeName(url) ? 'active' : ''}" href="${url}">${getIcon(icon)}<span>${label}</span></a>`).join('')}</nav>
    <div class="sidebar-user"><div class="user-card"><span class="avatar" aria-hidden="true">${getIcon('user',24)}</span><span><span>${profile.name || profile.email}</span><small>${profile.role === 'admin' ? 'Administrador' : 'Usuário'}</small></span></div><button class="btn logout-btn" data-action="logout">${getIcon('logout')} Sair</button></div>
  </aside>`;
}

export function createMobileNav(profile, active) {
  const items = profile.role === 'admin'
    ? [['dashboard','Início','#dashboard'],['wrench','Oficina','#oficina'],['plus','Novo','#orcamentos?action=new'],['users','Clientes','#clientes'],['more','Mais','#administracao']]
    : [['users','Clientes','#clientes'],['file','Orçamentos','#orcamentos'],['settings','Perfil','#perfil'],['logout','Sair','#logout']];
  return `<nav class="mobile-nav" aria-label="Menu mobile">${items.map(([icon,label,url],index) => `<a class="${active === routeName(url) ? 'active' : ''} ${index === 2 && profile.role === 'admin' ? 'mobile-create' : ''}" href="${url}" ${url === '#logout' ? 'data-action="logout"' : ''}>${getIcon(icon,19)}<span>${label}</span></a>`).join('')}</nav>`;
}
