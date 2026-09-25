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
