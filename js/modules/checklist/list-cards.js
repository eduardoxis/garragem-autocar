import {formatNumber} from '../../utils/numbers.js';
import { getIcon } from '../../components/icons.js';
import { formatDateTime } from '../../utils/date.js';
import { esc } from './document.js';

export function checklistCards(records, { canDelete = false } = {}) {
  if (!records.length) return '<p class="checklist-cards-empty" role="status">Nenhum checklist encontrado.</p>';
  const row = (icon, label, value) => '<div class="checklist-card-line"><dt>' + getIcon(icon, 18) + '<span>' + label + '</span></dt><dd>' + value + '</dd></div>';
  return records.map(record => {
    const d = record.data, c = record.confirmation || {}, draft = record.status === 'Em preenchimento';
    const status = record.status === 'Finalizado' ? 'finished' : draft ? 'draft' : 'other';

    return '<article class="checklist-mobile-card" aria-label="' + esc(record.code) + '"><header><div><h2>' + esc(record.code) + ' · v' + esc(record.version) + '</h2><p>' + esc(formatDateTime(d.entryDate)) + '</p></div><span class="checklist-card-status status-' + status + '">' + esc(record.status) + '</span></header><dl>' +
      row('user', 'Cliente', esc(d.customerName)) +
      row('car', 'Veículo', esc([d.brand, d.model].filter(Boolean).join(' ')) + '<small>Placa: ' + esc(d.plate) + ' · ' + esc(formatNumber(d.mileage,{decimals:0})) + ' KM</small>') +
      row('wrench', 'Responsável', esc(d.responsible || '—')) +
      row('check', 'Vistoria', esc(record.status)) +
      row('file', 'Ciência / Método', esc(c.status || 'Não enviado') + '<small>' + esc(c.method || '—') + '</small>') +
      '</dl><footer>' + checklistActions(record, { canDelete }) + '</footer>' + (draft ? '<p class="checklist-card-hint">PDF disponível após finalizar a vistoria.</p>' : '') + '</article>';
  }).join('');
}

export function checklistActions(record, { canDelete = false, desktop = false } = {}) {
  const draft = record.status === 'Em preenchimento';
  const button = (action, icon, label, disabled = false, hint = '') => '<button type="button" class="btn checklist-card-action action-' + action + '" data-checklist-action="' + action + '" data-id="' + esc(record.id) + '" ' + (desktop && action === 'open' ? 'data-open="' + esc(record.id) + '" ' : '') + (disabled ? 'disabled ' : '') + (hint ? 'title="' + esc(hint) + '" ' : '') + 'aria-label="' + label + ' ' + esc(record.code) + '">' + getIcon(icon, 18) + label + '</button>';
  return button('open', 'eye', 'Abrir') + button('pdf', 'pdf', 'PDF', draft, draft ? 'Finalize a vistoria para gerar o PDF.' : '') + button('edit', 'edit', 'Editar', false, draft ? '' : 'Cria uma nova versão, preservando a vistoria anterior.') + (canDelete ? button('delete', 'trash', 'Excluir') : '');
}
