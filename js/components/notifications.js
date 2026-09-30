import { listRecords } from '../firebase/firestore.js';
import { getIcon } from './icons.js';

const CLOSED_STATUSES = ['concluida', 'concluído', 'concluido', 'entregue', 'cancelada', 'cancelado', 'completed', 'cancelled', 'pago', 'recebido'];
const notificationCache = new Map();
const filters = [
  ['all', 'Todas'], ['orcamentos', 'Orçamentos'], ['oficina', 'Oficina'], ['estoque', 'Estoque'], ['financeiro', 'Financeiro']
];

const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' })[char]);
const asDate = value => {
  if (!value) return null;
  if (typeof value?.toDate === 'function') return value.toDate();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};
const dateLabel = value => {
  const date = asDate(value);
  return date ? new Intl.DateTimeFormat('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric' }).format(date) : 'sem data definida';
};
const isClosed = status => CLOSED_STATUSES.includes(String(status || '').toLocaleLowerCase('pt-BR'));
const priorityFor = date => {
  const target = asDate(date);
  if (!target) return 'normal';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return target < today ? 'urgent' : target.getTime() === today.getTime() ? 'high' : 'normal';
};

async function recordsFor(collection, companyId) {
  try { return (await listRecords(collection, companyId, { pageSize: 100 })).records; }
  catch (error) { console.warn(`Não foi possível carregar alertas de ${collection}.`, error); return []; }
}

async function collectNotifications(profile) {
  const cached = notificationCache.get(profile.companyId);
  if (cached && Date.now() - cached.at < 60_000) return cached.notes;
  const [reminders, products, serviceOrders, financial] = await Promise.all([
    recordsFor('reminders', profile.companyId), recordsFor('products', profile.companyId),
    recordsFor('serviceOrders', profile.companyId), recordsFor('financial', profile.companyId)
  ]);
  const notes = [];
  reminders.filter(item => !isClosed(item.status)).forEach(item => {
    const category = item.type === 'quote_follow_up' ? 'orcamentos' : item.type === 'payment' ? 'financeiro' : 'oficina';
    const isQuote = category === 'orcamentos';
    notes.push({
      category, priority: priorityFor(item.scheduledAt), time: asDate(item.scheduledAt)?.getTime() || 0,
      icon: isQuote ? 'file' : category === 'financeiro' ? 'money' : 'clock',
      title: isQuote ? 'Follow-up de orçamento' : category === 'financeiro' ? 'Lembrete financeiro' : 'Revisão ou pós-venda',
      detail: `${item.customerName || 'Cliente não informado'} · ${dateLabel(item.scheduledAt)}`,
      route: category === 'orcamentos' ? '#orcamentos' : category === 'financeiro' ? '#financeiro' : '#pos-venda'
    });
  });
  products.filter(item => Number(item.minimumStock ?? item.minStock ?? 0) > 0 && Number(item.quantity ?? item.stock ?? 0) <= Number(item.minimumStock ?? item.minStock)).forEach(item => {
    const quantity = Number(item.quantity ?? item.stock ?? 0);
    notes.push({ category:'estoque', priority:quantity <= 0 ? 'urgent' : 'high', time:0, icon:'box', title:'Estoque baixo', detail:`${item.name || item.description || 'Item sem nome'} · ${quantity} unidade(s)`, route:'#estoque' });
  });
  serviceOrders.filter(item => !isClosed(item.status) && item.forecastDate).forEach(item => {
    const priority = priorityFor(item.forecastDate);
    if (priority !== 'normal') notes.push({ category:'oficina', priority, time:asDate(item.forecastDate)?.getTime() || 0, icon:'wrench', title:'Ordem de serviço com prazo', detail:`${item.code || item.number || 'OS'} · previsão ${dateLabel(item.forecastDate)}`, route:'#ordens-servico' });
  });
  financial.filter(item => !isClosed(item.status) && item.dueDate).forEach(item => {
    const priority = priorityFor(item.dueDate);
    if (priority !== 'normal') notes.push({ category:'financeiro', priority, time:asDate(item.dueDate)?.getTime() || 0, icon:'money', title:'Conta com vencimento', detail:`${item.description || item.category || 'Lançamento'} · ${dateLabel(item.dueDate)}`, route:'#financeiro' });
  });
  const order = { urgent:0, high:1, normal:2 };
  const sorted = notes.sort((a, b) => order[a.priority] - order[b.priority] || a.time - b.time);
  notificationCache.set(profile.companyId, { at: Date.now(), notes: sorted });
  return sorted;
}

function renderPanel(notes, active = 'all') {
  const items = notes.filter(note => active === 'all' || note.category === active);
  return `<section class="notifications-panel" id="notifications-panel" aria-label="Central de notificações">
    <header class="notifications-panel__header"><div><strong>Notificações</strong><small>${notes.length ? `${notes.length} pendência(s) para acompanhar` : 'Tudo em dia por aqui'}</small></div><button class="btn btn-icon" type="button" data-notification-close aria-label="Fechar notificações">${getIcon('x', 18)}</button></header>
    <div class="notifications-tabs">${filters.map(([key, label]) => `<button type="button" data-notification-filter="${key}" class="${active === key ? 'active' : ''}">${label}</button>`).join('')}</div>
    <div class="notifications-list">${items.length ? items.map((item, index) => `<button type="button" class="notification-item notification-item--${item.priority}" data-notification-route="${item.route}"><span class="notification-item__icon">${getIcon(item.icon, 19)}</span><span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.detail)}</small></span>${index < 3 ? '<b>Ver</b>' : ''}</button>`).join('') : `<div class="notifications-empty">${getIcon('check', 28)}<strong>Nenhuma pendência nesta categoria</strong><span>Os alertas aparecem aqui quando exigirem atenção.</span></div>`}</div>
    <footer><a href="#lembretes" data-notification-route="#lembretes">Ver central de lembretes</a></footer>
  </section>`;
}

export function setupNotifications(profile) {
  window.__notificationsCleanup?.();
  document.querySelector('#notifications-panel')?.remove();
  const button = document.querySelector('#notification-button');
  if (!button || !profile?.companyId) return;
  let notes = [];
  let active = 'all';
  let panel = null;
  const setBadge = count => {
    const badge = document.querySelector('#notification-count');
    if (!badge) return;
    badge.textContent = count > 99 ? '99+' : String(count);
    badge.classList.toggle('is-hidden', count === 0);
  };
  const close = () => { panel?.remove(); panel = null; button.setAttribute('aria-expanded', 'false'); };
  const open = async () => {
    close();
    button.setAttribute('aria-expanded', 'true');
    panel = document.createElement('div');
    panel.innerHTML = '<section class="notifications-panel notifications-panel--loading"><span>Carregando notificações...</span></section>';
    document.body.append(panel.firstElementChild);
    panel = document.querySelector('#notifications-panel');
    notes = await collectNotifications(profile);
    setBadge(notes.length);
    panel.outerHTML = renderPanel(notes, active);
    panel = document.querySelector('#notifications-panel');
    bindPanel();
  };
  const bindPanel = () => {
    panel?.querySelector('[data-notification-close]')?.addEventListener('click', close);
    panel?.querySelectorAll('[data-notification-filter]').forEach(tab => tab.addEventListener('click', () => { active = tab.dataset.notificationFilter; panel.outerHTML = renderPanel(notes, active); panel = document.querySelector('#notifications-panel'); bindPanel(); }));
    panel?.querySelectorAll('[data-notification-route]').forEach(item => item.addEventListener('click', () => { const route = item.dataset.notificationRoute || item.getAttribute('href'); close(); location.hash = route; }));
  };
  button.addEventListener('click', event => { event.stopPropagation(); if (panel) close(); else open(); });
  const dismissOnOutsideClick = event => { if (panel && !panel.contains(event.target) && !button.contains(event.target)) close(); };
  document.addEventListener('click', dismissOnOutsideClick);
  window.__notificationsCleanup = () => document.removeEventListener('click', dismissOnOutsideClick);
  collectNotifications(profile).then(items => { notes = items; setBadge(items.length); });
}
