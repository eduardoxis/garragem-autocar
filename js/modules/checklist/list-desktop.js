import {formatNumber} from '../../utils/numbers.js';
import { getIcon } from '../../components/icons.js';
import { formatDateTime } from '../../utils/date.js';
import { esc } from './document.js';
import { checklistActions } from './list-cards.js';

export function checklistRows(records, options) {
  if (!records.length) return '<tr><td colspan="7" class="checklist-table-empty">Nenhum checklist encontrado.</td></tr>';
  return records.map(r => {
    const d = r.data, c = r.confirmation || {};
    const tone = r.status === 'Finalizado' ? 'finished' : r.status === 'Em preenchimento' ? 'draft' : 'other';
    return '<tr><td><strong class="checklist-code">' + esc(r.code) + ' · v' + esc(r.version) + '</strong><small>' + esc(formatDateTime(d.entryDate)) + '</small><span class="checklist-version">Versão ' + esc(r.version) + '</span></td><td>' + esc(d.customerName) + (d.document ? '<small>CPF/CNPJ: ' + esc(d.document) + '</small>' : '') + '</td><td><strong>' + esc([d.brand, d.model].filter(Boolean).join(' ')) + '</strong><small>' + esc(d.plate) + ' · ' + esc(formatNumber(d.mileage,{decimals:0})) + ' KM</small></td><td>' + esc(d.responsible || '—') + '</td><td><span class="checklist-card-status status-' + tone + '">' + esc(r.status) + '</span></td><td>' + esc(c.status || 'Não enviado') + '<small>' + esc(c.method || '—') + '</small></td><td><div class="checklist-row-actions">' + checklistActions(r, { ...options, desktop: true }) + '</div></td></tr>';
  }).join('');
}

export function checklistSummary(records) {
  return [
    ['calendar', 'Total de checklists', records.length, 'total'],
    ['file', 'Em preenchimento', records.filter(r => r.status === 'Em preenchimento').length, 'draft'],
    ['clock', 'Revisões solicitadas', records.filter(r => r.confirmation?.status === 'Revisão solicitada').length, 'review']
  ].map(([icon, label, count, tone]) => '<article class="checklist-summary-card summary-' + tone + '"><span>' + getIcon(icon, 27) + '</span><div><p>' + label + '</p><strong>' + formatNumber(count) + '</strong></div></article>').join('');
}
