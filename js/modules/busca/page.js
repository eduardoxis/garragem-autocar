import { requireAuth } from '../../guards.js';
import { mountShell } from '../../app.js';
import { listRecords } from '../../firebase/firestore.js';
import { getIcon } from '../../components/icons.js';

const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, character => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[character]));
const profile = await requireAuth();
const page = mountShell(profile || {name:'Configuração pendente',role:'user'}, {title:'Busca global',active:''});
const term = new URLSearchParams(location.hash.split('?')[1] || '').get('q')?.trim() || '';
page.classList.add('global-search-page');
page.innerHTML = `<section class="page-heading page-hero global-search-hero"><span class="page-hero-icon">${getIcon('search',38)}</span><div><h1>Busca global</h1><p>Encontre clientes, veículos, orçamentos e ordens de serviço.</p></div></section><section class="toolbar module-toolbar global-search-toolbar"><label class="search">${getIcon('search',24)}<input id="search-term" class="input" value="${escapeHtml(term)}" placeholder="Cliente, placa, CPF, telefone ou número..."></label><button id="search-submit" class="btn btn-primary" type="button">${getIcon('search',22)} Pesquisar</button></section><section class="card global-search-results-card"><div id="search-results" class="empty"><div><strong>Informe algo para pesquisar</strong><p>A busca consulta os dados da sua oficina.</p></div></div></section>`;

const collections = [{name:'customers',label:'Cliente',route:'clientes',keys:['name','document','phone','whatsapp','email']},{name:'vehicles',label:'Veículo',route:'veiculos',keys:['plate','brand','model','ownerName']},{name:'quotes',label:'Orçamento',route:'orcamentos',keys:['code','customerName','plate','vehicle']},{name:'serviceOrders',label:'Ordem de Serviço',route:'ordens-servico',keys:['code','customerName','plate','vehicle']}];
async function search() {
  const value = page.querySelector('#search-term').value.trim().toLocaleLowerCase('pt-BR');
  if (!value || !profile) return;
  const target = page.querySelector('#search-results');
  target.innerHTML = '<div class="empty"><div class="skeleton" style="width:240px"></div></div>';
  const results = (await Promise.all(collections.map(async source => {
    const {records} = await listRecords(source.name, profile.companyId, {pageSize:100});
    return records.filter(record => source.keys.some(key => String(record[key] || '').toLocaleLowerCase('pt-BR').includes(value))).map(record => ({...record, source}));
  }))).flat();
  target.innerHTML = results.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Tipo</th><th>Registro</th><th>Cliente</th><th>Veículo/Placa</th><th></th></tr></thead><tbody>${results.map(item => `<tr><td><span class="badge">${item.source.label}</span></td><td><strong>${escapeHtml(item.code || item.name || item.plate || '—')}</strong></td><td>${escapeHtml(item.customerName || item.ownerName || '—')}</td><td>${escapeHtml(item.vehicle || [item.brand,item.model,item.plate].filter(Boolean).join(' ') || item.plate || '—')}</td><td><a class="btn action-btn" href="#${item.source.route}">Abrir</a></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty"><div><strong>Nenhum resultado encontrado</strong><p>Tente pesquisar por outro termo.</p></div></div>';
}
page.querySelector('#search-submit').addEventListener('click',search);
page.querySelector('#search-term').addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();search();}});
if (term) await search();
