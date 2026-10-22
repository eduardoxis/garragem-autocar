export const formatDate = value => {
  const date = value?.toDate ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('pt-BR').format(date);
};
export const greeting = date => date.getHours() < 12 ? 'Bom dia' : date.getHours() < 18 ? 'Boa tarde' : 'Boa noite';
export const nextDayAt = (date = new Date(), hour = 9) => {
  const result = new Date(date);
  result.setDate(result.getDate() + 1);
  result.setHours(hour, 0, 0, 0);
  return result;
};

// Entry fields have no zone; keep the wall-clock time entered at the workshop.
// Server timestamps represent an instant and are displayed in the workshop zone.
export const formatDateTime = value => {
  if (!value) return '—';
  const date = value?.toDate ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const local = typeof value === 'string' && value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/);
  if (local) return `${local[3]}/${local[2]}/${local[1]} às ${local[4]}:${local[5]}`;
  const fields = Object.fromEntries(new Intl.DateTimeFormat('pt-BR', {timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date).map(part => [part.type,part.value]));
  return `${fields.day}/${fields.month}/${fields.year} às ${fields.hour}:${fields.minute}`;
};
