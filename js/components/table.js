export function createTable({ columns, records, actions = () => '' }) {
  if (!records.length) return '<div class="empty"><div><strong>Nenhum registro encontrado</strong><p>Cadastre o primeiro item ou ajuste os filtros.</p></div></div>';
  return `<div class="table-wrap"><table class="table"><thead><tr>${columns.map(column => `<th>${column.label}</th>`).join('')}<th>Ações</th></tr></thead><tbody>${records.map(record => `<tr>${columns.map(column => `<td>${column.render ? column.render(record[column.key],record) : record[column.key] || '—'}</td>`).join('')}<td>${actions(record)}</td></tr>`).join('')}</tbody></table></div>`;
}
