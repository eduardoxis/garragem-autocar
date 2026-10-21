// Shared by browser and API. Monetary stages are rounded in integer cents.
export const cents = value => { const n = Number(value); if (!['number','string'].includes(typeof value) || String(value).trim()==='' || !Number.isFinite(n) || n < 0 || n > 1e9) throw new Error('Valor monetário inválido.'); return Math.round((n + Number.EPSILON) * 100); };
export function discountAmount(base, value = 0, type = 'fixed') {
  if (!['number','string'].includes(typeof value) || String(value).trim()==='' || !['fixed','percent'].includes(type)) throw new Error('Informe um desconto válido.');
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || (type === 'percent' && n > 100)) throw new Error('Desconto fora dos limites.');
  const result = type === 'percent' ? Math.round(base * n / 100) : cents(n);
  if (result > base) throw new Error('Desconto maior que o valor disponível.');
  return result;
}
export function itemBreakdown(item) {
  const q = Number(item.quantity); if (!Number.isFinite(q) || q < 0 || q > 1e6) throw new Error('Quantidade inválida.');
  const original = Math.round(cents(item.unitPrice) * q);
  if (!Number.isSafeInteger(original) || original > 1e11) throw new Error('Subtotal fora do limite.');
  const discount = discountAmount(original, item.discount === undefined ? 0 : item.discount, item.discountType || 'fixed');
  const addition = cents(item.addition ?? 0);
  return { original, discount, addition, total: original - discount + addition };
}
export function quoteBreakdown(items, options = {}) {
  if (!Array.isArray(items) || items.length > 200) throw new Error('Lista de itens inválida.');
  const rows = items.map(itemBreakdown);
  const original = rows.reduce((s,r)=>s+r.original,0), itemDiscount = rows.reduce((s,r)=>s+r.discount,0), additions = rows.reduce((s,r)=>s+r.addition,0);
  const afterItems = original - itemDiscount + additions;
  const generalDiscount = discountAmount(afterItems, options.generalDiscount === undefined ? 0 : options.generalDiscount, options.generalDiscountType || 'fixed');
  const beforePayment = afterItems - generalDiscount;
  const eligible = ['cash','pix'].includes(options.paymentMethod);
  const rule = eligible ? options.paymentDiscount : null;
  const paymentDiscount = rule?.enabled ? discountAmount(beforePayment, rule.value, rule.type) : 0;
  return { rows, original, itemDiscount, additions, afterItems, generalDiscount, beforePayment, paymentDiscount, total: beforePayment-paymentDiscount };
}
export function paymentRule(settings, method) {
  return ['cash','pix'].includes(method) ? (settings.paymentDiscounts?.[method] || {enabled:false,type:'fixed',value:0}) : {enabled:false,type:'fixed',value:0};
}
