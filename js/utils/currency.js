export const toNumber = value => Number(String(value ?? '').replace(/[^\d,-]/g, '').replace('.', '').replace(',', '.')) || 0;
export const currency = value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0);
export const calculateItem = item => Math.max(0, (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0) - (Number(item.discount) || 0) + (Number(item.addition) || 0));
export const calculateQuote = items => items.reduce((total, item) => total + calculateItem(item), 0);
