import { getIcon } from './icons.js';

export function createTable({ columns, records, actions = () => '', emptyActionLabel = 'Cadastrar novo' }) {
  if (!records.length) return `<div class="empty"><div class="empty-content"><span class="empty-icon">${getIcon('file',42)}</span><strong>Nenhum registro encontrado</strong><p>Cadastre o primeiro item ou ajuste os filtros.</p><button class="btn btn-primary" type="button" data-action="new">${getIcon('plus',20)} ${emptyActionLabel}</button></div></div>`;
  return `<div class="table-wrap"><table class="table"><thead><tr>${columns.map(column => `<th>${column.label}</th>`).join('')}<th>Ações</th></tr></thead><tbody>${records.map(record => `<tr>${columns.map(column => `<td>${column.render ? column.render(record[column.key],record) : record[column.key] || '—'}</td>`).join('')}<td>${actions(record)}</td></tr>`).join('')}</tbody></table></div>`;
}
