import { requireAuth } from '../guards.js';
import { mountShell, setupErrorBoundary } from '../app.js';
import { createModal, createConfirmDialog } from '../components/modal.js';
import { createTable } from '../components/table.js';
import { createToast } from '../components/toast.js';
import { getIcon } from '../components/icons.js';
import { listRecords, saveRecord, softDelete, writeAudit } from '../firebase/firestore.js';
import { formatDate } from '../utils/date.js';
import { imageFileToDataUrl } from '../utils/image.js';

const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[char]));

function inputFor(field, value = '', lookupOptions = []) {
  const required = field.required ? 'required' : '';
  const common = `class="${field.type === 'textarea' ? 'textarea' : field.type === 'select' ? 'select' : 'input'}" name="${field.key}" id="field-${field.key}" ${required}`;
  if (field.reference) return `<select class="select" name="${field.key}" id="field-${field.key}" ${required}><option value="">${field.reference.placeholder || 'Selecione...'}</option>${lookupOptions.map(option => `<option value="${escapeHtml(option.id)}" ${String(option.id) === String(value) ? 'selected' : ''}>${escapeHtml(option.label)}</option>`).join('')}</select>`;
  if (field.type === 'select') return `<select ${common}>${(field.options || []).map(option => `<option value="${escapeHtml(option.value ?? option)}" ${String(option.value ?? option) === String(value) ? 'selected' : ''}>${escapeHtml(option.label ?? option)}</option>`).join('')}</select>`;
  if (field.type === 'textarea') return `<textarea ${common}>${escapeHtml(value)}</textarea>`;
  if (field.type === 'checkbox') return `<label class="checkbox-row"><input name="${field.key}" type="checkbox" ${value ? 'checked' : ''}> ${field.help || field.label}</label>`;
  if (field.type === 'image') return `<div class="image-upload">${value ? `<img src="${escapeHtml(value)}" alt="Prévia da imagem atual">` : ''}<input class="input" name="${field.key}" id="field-${field.key}" type="file" accept="image/*"><small>Selecione uma imagem de até 5 MB. Ela será otimizada antes de salvar.</small></div>`;
  return `<input ${common} type="${field.type || 'text'}" value="${escapeHtml(value)}" ${field.placeholder ? `placeholder="${escapeHtml(field.placeholder)}"` : ''}>`;
}

function formFor(fields, record = null, lookups = {}) {
  const values = record || {};
  const form = document.createElement('form');
  form.className = 'form-grid';
  form.innerHTML = fields.map(field => `<div class="field ${field.full ? 'full' : ''}">${field.type === 'checkbox' ? '' : `<label for="field-${field.key}">${field.label}</label>`}${inputFor(field, values[field.key], lookups[field.key] || [])}</div>`).join('');
  fields.filter(field => field.reference?.copy).forEach(field => {
    form.elements[field.key].addEventListener('change', event => {
      const selected = (lookups[field.key] || []).find(item => item.id === event.target.value);
      if (!selected) return;
      Object.entries(field.reference.copy).forEach(([target, source]) => {
        if (form.elements[target]) form.elements[target].value = typeof source === 'function' ? source(selected.record) : selected.record[source];
      });
    });
  });
  return form;
}

export async function createCrudPage(config) {
  setupErrorBoundary();
  const profile = await requireAuth({ roles:config.roles || (config.adminOnly ? ['admin'] : null) });
  const page = mountShell(profile || { name: 'Configuração pendente', email: '', role: 'admin' }, { title: config.title, active: config.active });
  page.classList.add('module-page', `module-${config.active}`);
  page.innerHTML = `<div class="setup-banner">Configure o Firebase para carregar e salvar os dados reais.</div><section class="page-heading page-hero"><span class="page-hero-icon"></span><div><h1>${config.title}</h1><p>${config.subtitle}</p></div><button class="btn btn-primary" id="new-record">${getIcon('plus')} ${config.newLabel || `Novo ${config.singular}`}</button></section>${config.hideMetrics ? '' : '<section class="grid stats-grid module-metrics" id="page-summary"></section>'}<section class="toolbar module-toolbar"><label class="search"><span class="sr-only">Pesquisar</span>${getIcon('search')}<input class="input" id="search" placeholder="${config.searchPlaceholder || 'Pesquisar...'}"></label>${config.filterHtml || `<button class="btn filter-toggle" id="filter-toggle" type="button">${getIcon('filter',19)} Filtros</button>`}<div class="quick-filter-panel hidden" id="quick-filter-panel"><label class="field"><span>Status</span><select class="select" id="status-filter"><option value="">Todos</option></select></label><button class="btn" id="clear-filter" type="button">${getIcon('refresh',17)} Limpar filtros</button></div></section><section class="card module-list-card"><header class="module-list-header"><span class="module-list-icon">${getIcon(config.icon || 'file',22)}</span><div><h2>${config.listTitle || `Lista de ${config.title}`}</h2><p>${config.listSubtitle || `Visualize e gerencie os registros de ${config.title.toLocaleLowerCase('pt-BR')}.`}</p></div><span class="module-list-total" id="list-total"></span></header><div id="records"><div class="empty"><div class="skeleton" style="width:180px"></div></div></div><div class="pagination"><button class="btn" id="load-more">${getIcon('refresh',17)} Carregar mais</button><span id="record-count"></span></div></section>`;
  const pageIcons = {clientes:'users',veiculos:'car',agenda:'calendar',estoque:'box',fornecedores:'truck',financeiro:'money','ordens-servico':'file','pos-venda':'clock',servicos:'wrench'};
  page.querySelector('.page-hero-icon').innerHTML = getIcon(config.icon || pageIcons[config.active] || 'file', 30);
  if (!profile) {
    page.querySelector('#records').innerHTML = '<div class="empty"><div><strong>Firebase ainda não configurado</strong><p>Depois de informar as credenciais, os registros reais aparecerão aqui.</p></div></div>';
    page.querySelector('#load-more').disabled = true;
    return;
  }

  let records = [];
  let filtered = [];
  let cursor = null;
  const recordsElement = page.querySelector('#records');
  const metricsElement = page.querySelector('#page-summary');

  const actionButtons = record => `<details class="row-menu"><summary class="btn btn-icon" aria-label="Ações">${getIcon('more',18)}</summary><div><button type="button" data-action="open" data-id="${record.id}">${getIcon('eye',15)} Abrir</button><button type="button" data-action="edit" data-id="${record.id}">${getIcon('edit',15)} Editar</button><button type="button" class="danger" data-action="delete" data-id="${record.id}">${getIcon('trash',15)} Excluir</button></div></details>`;
  const render = () => {
    if (metricsElement) {
      const now = new Date();
      const newThisMonth = records.filter(item => {
        const createdAt = item.createdAt?.toDate ? item.createdAt.toDate() : new Date(item.createdAt || 0);
        return createdAt.getFullYear() === now.getFullYear() && createdAt.getMonth() === now.getMonth();
      }).length;
      const updatedToday = records.filter(item => {
        const updatedAt = item.updatedAt?.toDate ? item.updatedAt.toDate() : new Date(item.updatedAt || item.createdAt || 0);
        return updatedAt.toDateString() === now.toDateString();
      }).length;
      if (config.summary) metricsElement.innerHTML = config.summary(records);
      else {
        const metricItems = config.metrics?.(records, filtered) || [
          {icon:config.icon || 'file',label:`Total de ${config.title}`,value:records.length,tone:'orange'},
          {icon:'plus',label:'Novos no mês',value:newThisMonth,tone:'blue'},
          {icon:'search',label:'Registros exibidos',value:filtered.length,tone:'green'},
          {icon:'clock',label:'Atualizados hoje',value:updatedToday,tone:'orange'}
        ];
        metricsElement.innerHTML = metricItems.map(item => `<article class="card stat-card metric-card metric-card--${item.tone || 'orange'}"><span class="stat-icon">${getIcon(item.icon || 'file',24)}</span><div><small>${item.label}</small><strong>${item.value}</strong>${item.note ? `<span>${item.note}</span>` : ''}</div></article>`).join('');
      }
    }
    recordsElement.innerHTML = createTable({ columns: config.columns, records: filtered, actions: actionButtons, emptyActionLabel:config.newLabel || `Cadastrar ${config.singular}` });
    page.querySelector('#record-count').textContent = `${filtered.length} registro(s)`;
    page.querySelector('#list-total').textContent = `Total de ${records.length} registro(s)`;
  };
  const applySearch = () => {
    const term = page.querySelector('#search').value.trim().toLocaleLowerCase('pt-BR');
    const status = page.querySelector('#status-filter')?.value || '';
    filtered = records.filter(record => (!term || config.searchKeys.some(key => String(record[key] || '').toLocaleLowerCase('pt-BR').includes(term))) && (!status || String(record.status || '') === status));
    render();
  };
  const load = async append => {
    recordsElement.innerHTML = '<div class="empty"><div class="skeleton" style="width:220px"></div></div>';
    const result = await listRecords(config.collection, profile.companyId, { after: append ? cursor : null, pageSize: config.pageSize || 20 });
    cursor = result.cursor;
    records = append ? [...records, ...result.records] : result.records;
    const statusFilter = page.querySelector('#status-filter');
    if (statusFilter) {
      const selected = statusFilter.value;
      const statuses = [...new Set(records.map(item => item.status).filter(Boolean))].sort();
      statusFilter.innerHTML = `<option value="">Todos</option>${statuses.map(status => `<option ${status === selected ? 'selected' : ''}>${escapeHtml(status)}</option>`).join('')}`;
    }
    applySearch();
  };
  const openForm = async record => {
    const lookupFields = config.fields.filter(field => field.reference);
    const lookups = {};
    await Promise.all(lookupFields.map(async field => {
      const { records: options } = await listRecords(field.reference.collection, profile.companyId, { pageSize:1000 });
      lookups[field.key] = options.map(option => ({ id:option.id, label:field.reference.label(option), record:option }));
    }));
    const form = formFor(config.fields, record, lookups);
    createModal({ title: record ? `Editar ${config.singular}` : config.newLabel || `Novo ${config.singular}`, content: form, confirmText: record ? 'Salvar alterações' : 'Cadastrar', onConfirm: async () => {
      if (!form.reportValidity()) return false;
      const data = Object.fromEntries(new FormData(form));
      for (const field of config.fields.filter(item => item.type === 'image')) {
        const file = data[field.key];
        delete data[field.key];
        if (file?.size) data[field.key] = await imageFileToDataUrl(file);
        else if (record?.[field.key]) data[field.key] = record[field.key];
      }
      config.fields.filter(field => field.type === 'checkbox').forEach(field => { data[field.key] = form.elements[field.key].checked; });
      const normalized = config.normalize ? config.normalize(data, record) : data;
      const recordId = await saveRecord(config.collection, profile.companyId, normalized, record?.id);
      const auditValue = Object.fromEntries(Object.entries(normalized).filter(([key]) => !config.fields.some(field => field.type === 'image' && field.key === key)));
      await writeAudit({ companyId:profile.companyId,userId:profile.uid,userName:profile.name,action:record?'update':'create',module:config.collection,recordId,recordCode:normalized[config.titleKey],oldValue:record,newValue:auditValue });
      createToast(`${config.singular} ${record ? 'atualizado' : 'cadastrado'} com sucesso.`);
      await load(false);
    }});
  };
  const openDetails = record => {
    const content = `<div class="form-grid">${config.fields.filter(field => !field.hiddenInDetails).map(field => `<div class="field ${field.full ? 'full' : ''}"><label>${field.label}</label><div>${escapeHtml(record[field.key] || '—')}</div></div>`).join('')}<div class="field"><label>Cadastrado em</label><div>${formatDate(record.createdAt)}</div></div></div>`;
    createModal({ title: record[config.titleKey] || config.singular, content, confirmText: 'Fechar', cancelText: 'Editar', onConfirm: () => true });
  };

  page.querySelector('#new-record').addEventListener('click', () => { openForm(null).catch(error => { console.error(error); createToast('Não foi possível abrir o formulário.','error'); }); });
  page.querySelector('#search').addEventListener('input', applySearch);
  page.querySelector('#status-filter')?.addEventListener('change', applySearch);
  page.querySelector('#filter-toggle')?.addEventListener('click', () => page.querySelector('#quick-filter-panel').classList.toggle('hidden'));
  page.querySelector('#clear-filter')?.addEventListener('click', () => { page.querySelector('#status-filter').value=''; page.querySelector('#search').value=''; applySearch(); });
  page.querySelector('#load-more').addEventListener('click', () => load(true));
  recordsElement.addEventListener('click', event => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    if (button.dataset.action === 'new') { openForm(null).catch(error => { console.error(error); createToast('Não foi possível abrir o formulário.','error'); }); return; }
    const record = records.find(item => item.id === button.dataset.id);
    if (button.dataset.action === 'open') openDetails(record);
    if (button.dataset.action === 'edit') openForm(record).catch(error => { console.error(error); createToast('Não foi possível abrir o formulário.','error'); });
    if (button.dataset.action === 'delete') createConfirmDialog(`Enviar ${record[config.titleKey] || 'este registro'} para a lixeira?`, async () => { await softDelete(config.collection, record.id, profile.uid); await writeAudit({companyId:profile.companyId,userId:profile.uid,userName:profile.name,action:'soft_delete',module:config.collection,recordId:record.id,recordCode:record[config.titleKey],oldValue:record}); createToast('Registro enviado para a lixeira.'); await load(false); });
  });
  await load(false);
}
