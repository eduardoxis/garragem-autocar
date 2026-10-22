export function filterChecklists(records, filters) {
  const search = String(filters.search || '').toLocaleLowerCase('pt-BR');
  const employee = String(filters.employee || '').toLocaleLowerCase('pt-BR');
  return records.filter(r => [r.code, r.data.customerName, r.data.plate].join(' ').toLocaleLowerCase('pt-BR').includes(search)
    && String(r.data.responsible || '').toLocaleLowerCase('pt-BR').includes(employee)
    && (!filters.status || r.status === filters.status || r.confirmation?.status === filters.status)
    && (!filters.from || r.data.entryDate.slice(0, 10) >= filters.from)
    && (!filters.to || r.data.entryDate.slice(0, 10) <= filters.to));
}

export function checklistPage(records, page, size) {
  const pages = Math.max(1, Math.ceil(records.length / size));
  const current = Math.max(1, Math.min(page, pages));
  const start = (current - 1) * size;
  return { records: records.slice(start, start + size), current, pages, start: records.length ? start + 1 : 0, end: Math.min(start + size, records.length), total: records.length };
}
