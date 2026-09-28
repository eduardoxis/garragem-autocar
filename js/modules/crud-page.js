import { requireAuth } from '../guards.js';
import { mountShell, setupErrorBoundary } from '../app.js';
import { createModal, createConfirmDialog } from '../components/modal.js';
import { createTable } from '../components/table.js';
import { createToast } from '../components/toast.js';
import { getIcon } from '../components/icons.js';
import { listRecords, saveRecord, softDelete, writeAudit } from '../firebase/firestore.js';
import { formatDate } from '../utils/date.js';

const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[char]));

function inputFor(field, value = '') {
  const required = field.required ? 'required' : '';
  const common = `class="${field.type === 'textarea' ? 'textarea' : field.type === 'select' ? 'select' : 'input'}" name="${field.key}" id="field-${field.key}" ${required}`;
  if (field.type === 'select') return `<select ${common}>${(field.options || []).map(option => `<option value="${escapeHtml(option.value ?? option)}" ${String(option.value ?? option) === String(value) ? 'selected' : ''}>${escapeHtml(option.label ?? option)}</option>`).join('')}</select>`;
  if (field.type === 'textarea') return `<textarea ${common}>${escapeHtml(value)}</textarea>`;
  if (field.type === 'checkbox') return `<label class="checkbox-row"><input name="${field.key}" type="checkbox" ${value ? 'checked' : ''}> ${field.help || field.label}</label>`;
  return `<input ${common} type="${field.type || 'text'}" value="${escapeHtml(value)}" ${field.placeholder ? `placeholder="${escapeHtml(field.placeholder)}"` : ''}>`;
}

function formFor(fields, record = null) {
  const values = record || {};
  const form = document.createElement('form');
  form.className = 'form-grid';
  form.innerHTML = fields.map(field => `<div class="field ${field.full ? 'full' : ''}">${field.type === 'checkbox' ? '' : `<label for="field-${field.key}">${field.label}</label>`}${inputFor(field, values[field.key])}</div>`).join('');
  return form;
}

export async function createCrudPage(config) {
  setupErrorBoundary();
  const profile = await requireAuth({ role: config.adminOnly ? 'admin' : null });
  const page = mountShell(profile || { name: 'Configuração pendente', email: '', role: 'admin' }, { title: config.title, active: config.active });
  page.innerHTML = `<div class="setup-banner">Configure o Firebase para carregar e salvar os dados reais.</div><section class="page-heading"><div><h1>${config.title}</h1><p>${config.subtitle}</p></div><button class="btn btn-primary" id="new-record">${getIcon('plus')} ${config.newLabel || `Novo ${config.singular}`}</button></section><section class="toolbar"><label class="search"><span class="sr-only">Pesquisar</span>${getIcon('search')}<input class="input" id="search" placeholder="${config.searchPlaceholder || 'Pesquisar...'}"></label>${config.filterHtml || ''}</section><section class="card"><div id="records"><div class="empty"><div class="skeleton" style="width:180px"></div></div></div><div class="pagination"><button class="btn" id="load-more">Carregar mais</button><span id="record-count"></span></div></section>`;
  if (!profile) {
    page.querySelector('#records').innerHTML = '<div class="empty"><div><strong>Firebase ainda não configurado</strong><p>Depois de informar as credenciais, os registros reais aparecerão aqui.</p></div></div>';
    page.querySelector('#load-more').disabled = true;
    return;
  }

  let records = [];
  let filtered = [];
  let cursor = null;
  const recordsElement = page.querySelector('#records');

  const actionButtons = record => `<div class="actions"><button class="btn action-btn" data-action="open" data-id="${record.id}">${getIcon('eye',15)} Abrir</button><button class="btn action-btn" data-action="edit" data-id="${record.id}">${getIcon('edit',15)} Editar</button><button class="btn btn-danger action-btn" data-action="delete" data-id="${record.id}">${getIcon('trash',15)} Excluir</button></div>`;
  const render = () => {
    recordsElement.innerHTML = createTable({ columns: config.columns, records: filtered, actions: actionButtons });
    page.querySelector('#record-count').textContent = `${filtered.length} registro(s)`;
  };
  const applySearch = () => {
    const term = page.querySelector('#search').value.trim().toLocaleLowerCase('pt-BR');
    filtered = !term ? [...records] : records.filter(record => config.searchKeys.some(key => String(record[key] || '').toLocaleLowerCase('pt-BR').includes(term)));
    render();
  };
  const load = async append => {
    recordsElement.innerHTML = '<div class="empty"><div class="skeleton" style="width:220px"></div></div>';
    const result = await listRecords(config.collection, profile.companyId, { after: append ? cursor : null, pageSize: 20 });
    cursor = result.cursor;
    records = append ? [...records, ...result.records] : result.records;
    applySearch();
  };
  const openForm = record => {
    const form = formFor(config.fields, record);
    createModal({ title: record ? `Editar ${config.singular}` : config.newLabel || `Novo ${config.singular}`, content: form, confirmText: record ? 'Salvar alterações' : 'Cadastrar', onConfirm: async () => {
      if (!form.reportValidity()) return false;
      const data = Object.fromEntries(new FormData(form));
      config.fields.filter(field => field.type === 'checkbox').forEach(field => { data[field.key] = form.elements[field.key].checked; });
      const normalized = config.normalize ? config.normalize(data, record) : data;
      const recordId = await saveRecord(config.collection, profile.companyId, normalized, record?.id);
      await writeAudit({ companyId:profile.companyId,userId:profile.uid,userName:profile.name,action:record?'update':'create',module:config.collection,recordId,recordCode:normalized[config.titleKey],oldValue:record,newValue:normalized });
      createToast(`${config.singular} ${record ? 'atualizado' : 'cadastrado'} com sucesso.`);
      await load(false);
    }});
  };
  const openDetails = record => {
    const content = `<div class="form-grid">${config.fields.filter(field => !field.hiddenInDetails).map(field => `<div class="field ${field.full ? 'full' : ''}"><label>${field.label}</label><div>${escapeHtml(record[field.key] || '—')}</div></div>`).join('')}<div class="field"><label>Cadastrado em</label><div>${formatDate(record.createdAt)}</div></div></div>`;
    createModal({ title: record[config.titleKey] || config.singular, content, confirmText: 'Fechar', cancelText: 'Editar', onConfirm: () => true });
  };

  page.querySelector('#new-record').addEventListener('click', () => openForm(null));
  page.querySelector('#search').addEventListener('input', applySearch);
  page.querySelector('#load-more').addEventListener('click', () => load(true));
  recordsElement.addEventListener('click', event => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const record = records.find(item => item.id === button.dataset.id);
    if (button.dataset.action === 'open') openDetails(record);
    if (button.dataset.action === 'edit') openForm(record);
    if (button.dataset.action === 'delete') createConfirmDialog(`Enviar ${record[config.titleKey] || 'este registro'} para a lixeira?`, async () => { await softDelete(config.collection, record.id, profile.uid); await writeAudit({companyId:profile.companyId,userId:profile.uid,userName:profile.name,action:'soft_delete',module:config.collection,recordId:record.id,recordCode:record[config.titleKey],oldValue:record}); createToast('Registro enviado para a lixeira.'); await load(false); });
  });
  await load(false);
}
