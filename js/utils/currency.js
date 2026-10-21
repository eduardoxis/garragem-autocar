import { itemBreakdown, quoteBreakdown } from './discounts.js';
export const toNumber = value => Number(String(value ?? '').replace(/[^\d,-]/g, '').replace('.', '').replace(',', '.')) || 0;
export const currency = value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0);
export const calculateItem = item => itemBreakdown(item).total / 100;
export const calculateQuote = (items, options = {}) => quoteBreakdown(items, options).total / 100;
