import { requireAuth } from '../guards.js';
import { mountShell, setupErrorBoundary } from '../app.js';
import { createModal, createConfirmDialog } from '../components/modal.js';
import { createTable } from '../components/table.js';
import { createToast } from '../components/toast.js';
import { getIcon } from '../components/icons.js';
import { adminBackButton } from '../components/admin-back.js';
import { countRecords, listRecords, saveRecord, softDelete, writeAudit } from '../firebase/firestore.js';
import { formatDate } from '../utils/date.js';
import { imageFileToDataUrl } from '../utils/image.js';
import { applyInputMasks, formDataObject } from '../utils/masks.js';

const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[char]));

function inputFor(field, value = '', lookupOptions = []) {
  const required = field.required ? 'required' : '';
  const common = `class="${field.type === 'textarea' ? 'textarea' : field.type === 'select' ? 'select' : 'input'}" name="${field.key}" id="field-${field.key}" ${required}`;
  const numericPlaceholder = field.type === 'number' ? (/ano/i.test(field.label) ? 'Ex.: 2026' : /quilometragem/i.test(field.label) ? 'Ex.: 85000' : 'Ex.: 0') : '';
  if (field.reference) return `<select class="select" name="${field.key}" id="field-${field.key}" ${required}><option value="">${field.reference.placeholder || 'Selecione...'}</option>${lookupOptions.map(option => `<option value="${escapeHtml(option.id)}" ${String(option.id) === String(value) ? 'selected' : ''}>${escapeHtml(option.label)}</option>`).join('')}</select>`;
  if (field.type === 'select') return `<select ${common}>${(field.options || []).map(option => `<option value="${escapeHtml(option.value ?? option)}" ${String(option.value ?? option) === String(value) ? 'selected' : ''}>${escapeHtml(option.label ?? option)}</option>`).join('')}</select>`;
  if (field.type === 'textarea') return `<textarea ${common}>${escapeHtml(value)}</textarea>`;
  if (field.type === 'checkbox') return `<label class="checkbox-row"><input name="${field.key}" type="checkbox" ${value ? 'checked' : ''}> ${field.help || field.label}</label>`;
  if (field.type === 'image') return `<div class="image-upload">${value ? `<img src="${escapeHtml(value)}" alt="Prévia da imagem atual">` : ''}<input class="input" name="${field.key}" id="field-${field.key}" type="file" accept="image/*"><small>Selecione uma imagem de até 5 MB. Ela será otimizada antes de salvar.</small></div>`;
  return `<input ${common} type="${field.type || 'text'}" value="${escapeHtml(value)}" ${field.placeholder || numericPlaceholder ? `placeholder="${escapeHtml(field.placeholder || numericPlaceholder)}"` : ''}>`;
}

function formFor(fields, record = null, lookups = {}) {
  const values = record || {};
  const form = document.createElement('form');
  form.className = 'form-grid';
  form.innerHTML = fields.map(field => `<div class="field ${field.full ? 'full' : ''}">${field.type === 'checkbox' ? '' : `<label for="field-${field.key}">${field.label}</label>`}${inputFor(field, values[field.key], lookups[field.key] || [])}</div>`).join('');
  applyInputMasks(form);
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
  page.innerHTML = `<div class="setup-banner">Configure o Firebase para carregar e salvar os dados reais.</div><section class="page-heading page-hero"><span class="page-hero-icon"></span><div><h1>${config.title}</h1><p>${config.subtitle}</p></div><div class="page-heading-actions"><input id="import-json-file" type="file" accept="application/json,.json" hidden><button class="btn" id="import-json" type="button">${getIcon('file')} Importar JSON</button><button class="btn btn-primary" id="new-record">${getIcon('plus')} ${config.newLabel || `Novo ${config.singular}`}</button></div></section>${config.hideMetrics ? '' : '<section class="grid stats-grid module-metrics" id="page-summary"></section>'}<section class="toolbar module-toolbar"><label class="search"><span class="sr-only">Pesquisar</span>${getIcon('search')}<input class="input" id="search" placeholder="${config.searchPlaceholder || 'Pesquisar...'}"></label><button class="btn btn-primary search-submit" id="search-submit" type="button">${getIcon('search',17)} Pesquisar</button>${config.filterHtml || `<button class="btn filter-toggle" id="filter-toggle" type="button">${getIcon('filter',19)} Filtros</button>`}<div class="quick-filter-panel hidden" id="quick-filter-panel"><label class="field"><span>Status</span><select class="select" id="status-filter"><option value="">Todos</option></select></label><button class="btn" id="clear-filter" type="button">${getIcon('refresh',17)} Limpar filtros</button></div></section><section class="card module-list-card"><header class="module-list-header"><span class="module-list-icon">${getIcon(config.icon || 'file',22)}</span><div><h2>${config.listTitle || `Lista de ${config.title}`}</h2><p>${config.listSubtitle || `Visualize e gerencie os registros de ${config.title.toLocaleLowerCase('pt-BR')}.`}</p></div><span class="module-list-total" id="list-total"></span></header><div id="records"><div class="empty"><div class="skeleton" style="width:180px"></div></div></div><div class="pagination pagination-controls" id="record-pagination"></div></section>`;
  const pageIcons = {clientes:'users',veiculos:'car',agenda:'calendar',estoque:'box',fornecedores:'truck',financeiro:'money','ordens-servico':'file','pos-venda':'clock',servicos:'wrench'};
  if (config.adminBack) page.querySelector('.page-heading-actions')?.insertAdjacentHTML('afterbegin', adminBackButton());
  page.querySelector('.page-hero-icon').innerHTML = getIcon(config.icon || pageIcons[config.active] || 'file', 30);
  if (!profile) {
    page.querySelector('#records').innerHTML = '<div class="empty"><div><strong>Firebase ainda não configurado</strong><p>Depois de informar as credenciais, os registros reais aparecerão aqui.</p></div></div>';
    return;
  }

  let records = [];
  let filtered = [];
  let cursor = null;
  let currentPage = 1;
  let recordsPerPage = 10;
  let totalRecords = 0;
  let hasMore = false;
  const recordsElement = page.querySelector('#records');
  const metricsElement = page.querySelector('#page-summary');

  const actionButtons = record => `<div class="crud-actions" aria-label="Ações do registro">${config.rowActions?.(record) || ''}<button type="button" class="crud-action crud-action--open" data-action="open" data-id="${record.id}">${getIcon('eye',13)} Abrir</button><button type="button" class="crud-action crud-action--edit" data-action="edit" data-id="${record.id}">${getIcon('edit',13)} Editar</button><button type="button" class="crud-action crud-action--delete" data-action="delete" data-id="${record.id}">${getIcon('trash',13)} Excluir</button></div>`;
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
    const isFiltering = Boolean(page.querySelector('#search').value.trim() || page.querySelector('#status-filter')?.value);
    const availableRecords = isFiltering ? filtered.length : totalRecords;
    const totalPages = Math.max(1, Math.ceil(availableRecords / recordsPerPage));
    currentPage = Math.min(currentPage, totalPages);
    const start = (currentPage - 1) * recordsPerPage;
    const pageRecords = filtered.slice(start, start + recordsPerPage);
    recordsElement.innerHTML = createTable({ columns: config.columns, records: pageRecords, actions: actionButtons, emptyActionLabel:config.newLabel || `Cadastrar ${config.singular}` });
    const pagination = page.querySelector('#record-pagination');
    const first = availableRecords ? start + 1 : 0;
    const last = Math.min(start + recordsPerPage, availableRecords);
    const firstPage = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
    const pageButtons = Array.from({length:Math.min(5,totalPages)},(_,index)=>{
      const pageNumber = firstPage + index;
      return `<button class="page-button ${pageNumber === currentPage ? 'active' : ''}" type="button" data-page="${pageNumber}">${pageNumber}</button>`;
    }).join('');
    pagination.innerHTML = `<span class="pagination-summary">Mostrando ${first}-${last} de ${availableRecords} registro(s)</span><div class="pagination-actions"><button class="page-button page-previous" type="button" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>‹ Anterior</button>${pageButtons}<button class="page-button page-next" type="button" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}>Próxima ›</button><select class="select page-size" id="record-page-size" aria-label="Registros por página"><option value="10" ${recordsPerPage === 10 ? 'selected' : ''}>10 por página</option><option value="25" ${recordsPerPage === 25 ? 'selected' : ''}>25 por página</option><option value="50" ${recordsPerPage === 50 ? 'selected' : ''}>50 por página</option></select></div>`;
    page.querySelector('#list-total').textContent = `Total de ${availableRecords} registro(s)`;
  };
  const applySearch = (resetPage = false) => {
    const term = page.querySelector('#search').value.trim().toLocaleLowerCase('pt-BR');
    const status = page.querySelector('#status-filter')?.value || '';
    filtered = records.filter(record => (!term || config.searchKeys.some(key => String(record[key] || '').toLocaleLowerCase('pt-BR').includes(term))) && (!status || String(record.status || '') === status));
    if (resetPage) currentPage = 1;
    render();
  };
  const load = async append => {
    recordsElement.innerHTML = '<div class="empty"><div class="skeleton" style="width:220px"></div></div>';
    const result = await listRecords(config.collection, profile.companyId, { after: append ? cursor : null, pageSize: recordsPerPage });
    cursor = result.cursor;
    hasMore = result.hasMore;
    records = append ? [...records, ...result.records] : result.records;
    if (!append) totalRecords = await countRecords(config.collection, profile.companyId);
    const statusFilter = page.querySelector('#status-filter');
    if (statusFilter) {
      const selected = statusFilter.value;
      const statuses = [...new Set(records.map(item => item.status).filter(Boolean))].sort();
      statusFilter.innerHTML = `<option value="">Todos</option>${statuses.map(status => `<option ${status === selected ? 'selected' : ''}>${escapeHtml(status)}</option>`).join('')}`;
    }
    applySearch(!append);
  };
  const openForm = async record => {
    const lookupFields = config.fields.filter(field => field.reference);
    const lookups = {};
    await Promise.all(lookupFields.map(async field => {
      const { records: options } = await listRecords(field.reference.collection, profile.companyId, { pageSize:1000 });
      lookups[field.key] = options.map(option => ({ id:option.id, label:field.reference.label(option), record:option }));
    }));
    const form = formFor(config.fields, record, lookups);
    config.afterForm?.({ form, record, profile });
    createModal({ title: record ? `Editar ${config.singular}` : config.newLabel || `Novo ${config.singular}`, content: form, confirmText: record ? 'Salvar alterações' : 'Cadastrar', onConfirm: async () => {
      if (!form.reportValidity()) return false;
      const data = formDataObject(form);
      for (const field of config.fields.filter(item => item.type === 'image')) {
        const file = data[field.key];
        delete data[field.key];
        if (file?.size) data[field.key] = await imageFileToDataUrl(file);
        else if (record?.[field.key]) data[field.key] = record[field.key];
      }
      config.fields.filter(field => field.type === 'checkbox').forEach(field => { data[field.key] = form.elements[field.key].checked; });
      const normalized = config.normalize ? config.normalize(data, record) : data;
      const recordId = await saveRecord(config.collection, profile.companyId, normalized, record?.id);
      if (config.afterSave) await config.afterSave({ data:normalized, record, recordId, profile, saveRecord });
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
  const importInput = page.querySelector('#import-json-file');
  page.querySelector('#import-json').addEventListener('click', () => importInput.click());
  importInput.addEventListener('change', async () => {
    const file = importInput.files[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const imported = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed.records)
          ? parsed.records
          : Array.isArray(parsed.data?.[config.collection])
            ? parsed.data[config.collection]
            : null;
      if (!imported?.length) throw new Error('O JSON deve conter uma lista de registros.');
      let total = 0;
      for (const source of imported) {
        const { id, companyId, createdAt, updatedAt, deleted, deletedAt, deletedBy, ...data } = source || {};
        if (!data || typeof data !== 'object') continue;
        const normalized = config.normalize ? config.normalize(data, null) : data;
        await saveRecord(config.collection, profile.companyId, normalized);
        total += 1;
      }
      createToast(`${total} registro(s) importado(s) em ${config.title}.`);
      await load(false);
    } catch (error) {
      console.error(error);
      createToast(error.message || 'Não foi possível importar o JSON.','error');
    } finally { importInput.value = ''; }
  });
  page.querySelector('#search').addEventListener('input', () => applySearch(true));
  page.querySelector('#search-submit').addEventListener('click', () => applySearch(true));
  page.querySelector('#search').addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); applySearch(true); } });
  page.querySelector('#status-filter')?.addEventListener('change', () => applySearch(true));
  page.querySelector('#filter-toggle')?.addEventListener('click', () => page.querySelector('#quick-filter-panel').classList.toggle('hidden'));
  page.querySelector('#clear-filter')?.addEventListener('click', () => { page.querySelector('#status-filter').value=''; page.querySelector('#search').value=''; applySearch(true); });
  page.querySelector('#record-pagination').addEventListener('click', async event => {
    const button = event.target.closest('[data-page]');
    if (!button || button.disabled) return;
    const nextPage = Number(button.dataset.page);
    while (records.length < nextPage * recordsPerPage && hasMore) await load(true);
    if (records.length < (nextPage - 1) * recordsPerPage) return;
    currentPage = nextPage;
    render();
  });
  page.querySelector('#record-pagination').addEventListener('change', async event => {
    if (event.target.id !== 'record-page-size') return;
    recordsPerPage = Number(event.target.value);
    currentPage = 1;
    cursor = null;
    await load(false);
  });
  recordsElement.addEventListener('click', event => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    if (button.dataset.action === 'new') { openForm(null).catch(error => { console.error(error); createToast('Não foi possível abrir o formulário.','error'); }); return; }
    const record = records.find(item => item.id === button.dataset.id);
    if (config.onAction?.({ action:button.dataset.action, record, profile, refresh:() => load(false) })) return;
    if (button.dataset.action === 'open') openDetails(record);
    if (button.dataset.action === 'edit') openForm(record).catch(error => { console.error(error); createToast('Não foi possível abrir o formulário.','error'); });
    if (button.dataset.action === 'delete') createConfirmDialog(`Enviar ${record[config.titleKey] || 'este registro'} para a lixeira?`, async () => { await softDelete(config.collection, record.id, profile.uid); await writeAudit({companyId:profile.companyId,userId:profile.uid,userName:profile.name,action:'soft_delete',module:config.collection,recordId:record.id,recordCode:record[config.titleKey],oldValue:record}); createToast('Registro enviado para a lixeira.'); await load(false); });
  });
  await load(false);
}
