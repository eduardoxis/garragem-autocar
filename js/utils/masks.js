export const digits = value => String(value || '').replace(/\D/g, '');
export const normalizeWhatsapp = value => {
  const number = digits(value).replace(/^0+/, '');
  return number.startsWith('55') ? number : `55${number}`;
};
export const maskPhone = value => {
  const number = digits(value).slice(0, 11);
  if (number.length <= 10) return number.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
  return number.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
};
export const maskCpfCnpj = value => {
  const number = digits(value).slice(0, 14);
  return number.length <= 11
    ? number.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    : number.replace(/(\d{2})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1/$2').replace(/(\d{4})(\d{1,2})$/, '$1-$2');
};
export const maskCep = value => digits(value).slice(0, 8).replace(/(\d{5})(\d)/, '$1-$2');
export const maskPlate = value => String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);

export const parseCurrencyInput = value => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const raw = String(value ?? '').trim().replace(/R\$\s?/g, '');
  if (/^-?\d+(\.\d+)?$/.test(raw) && !raw.includes(',')) return Number(raw) || 0;
  const clean = raw.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
  return Number(clean) || 0;
};

export const formatCurrencyInput = value => {
  if (value === '' || value === null || value === undefined) return '';
  return new Intl.NumberFormat('pt-BR', { minimumFractionDigits:2, maximumFractionDigits:2 }).format(parseCurrencyInput(value));
};

export const maskCurrencyInput = value => {
  const number = Number(digits(value)) / 100;
  return new Intl.NumberFormat('pt-BR', { minimumFractionDigits:2, maximumFractionDigits:2 }).format(number);
};

const currencyFields = new Set(['amount','total','unitprice','costprice','saleprice','price','discount','addition']);

export function inputMaskFor(input) {
  if (!input?.name && !input?.dataset?.mask && !input?.dataset?.key) return '';
  if (input.dataset.mask) return input.dataset.mask;
  const name = String(input.name || input.dataset.key || '').toLocaleLowerCase('pt-BR');
  if (['document','cpf','cnpj','cpfcnpj'].includes(name)) return 'document';
  if (['phone','telephone','telefone','whatsapp','cellphone','celular'].includes(name)) return 'phone';
  if (['zipcode','cep','postalcode'].includes(name)) return 'cep';
  if (name === 'plate') return 'plate';
  if (currencyFields.has(name)) return 'currency';
  return '';
}

const placeholders = {
  document:'000.000.000-00 ou 00.000.000/0000-00',
  phone:'(00) 00000-0000',
  cep:'00000-000',
  plate:'ABC1D23',
  currency:'Ex.: 2.500,00'
};

function maskValue(mask, value, typing = false) {
  if (mask === 'document') return maskCpfCnpj(value);
  if (mask === 'phone') return maskPhone(value);
  if (mask === 'cep') return maskCep(value);
  if (mask === 'plate') return maskPlate(value);
  if (mask === 'currency') return typing ? maskCurrencyInput(value) : formatCurrencyInput(value);
  return value;
}

export function applyInputMasks(root = document) {
  const inputs = [];
  if (root?.matches?.('input')) inputs.push(root);
  root?.querySelectorAll?.('input').forEach(input => inputs.push(input));
  inputs.forEach(input => {
    const mask = inputMaskFor(input);
    if (!mask) {
      if (input.type === 'number' && !input.placeholder) {
        const name = String(input.name || input.dataset.key || '').toLocaleLowerCase('pt-BR');
        input.placeholder = /year|ano/.test(name) ? 'Ex.: 2026' : /validity|validade/.test(name) ? 'Ex.: 30' : /quantity|quantidade/.test(name) ? 'Ex.: 1' : /mileage|quilometragem/.test(name) ? 'Ex.: 85000' : 'Ex.: 0';
      }
      return;
    }
    input.dataset.mask = mask;
    input.inputMode = mask === 'plate' ? 'text' : 'numeric';
    input.autocomplete = mask === 'phone' ? 'tel' : 'off';
    if (mask === 'currency' && input.type === 'number') input.type = 'text';
    if (!input.placeholder) input.placeholder = placeholders[mask];
    input.value = maskValue(mask, input.value);
    if (input.dataset.maskBound === 'true') return;
    input.dataset.maskBound = 'true';
    input.addEventListener('input', () => {
      input.value = maskValue(mask, input.value, true);
      if (mask === 'currency') input.setSelectionRange(input.value.length, input.value.length);
    });
  });
  return root;
}

export function installInputMasks() {
  applyInputMasks(document);
  const observer = new MutationObserver(mutations => mutations.forEach(mutation => mutation.addedNodes.forEach(node => {
    if (node.nodeType === Node.ELEMENT_NODE) applyInputMasks(node);
  })));
  observer.observe(document.documentElement, { childList:true, subtree:true });
  return observer;
}

export function formDataObject(form) {
  const data = Object.fromEntries(new FormData(form));
  form.querySelectorAll('input[data-mask="currency"]').forEach(input => { data[input.name] = parseCurrencyInput(input.value); });
  return data;
}
