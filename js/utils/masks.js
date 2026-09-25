export const digits = value => String(value || '').replace(/\D/g, '');
export const normalizeWhatsapp = value => {
  const number = digits(value).replace(/^0+/, '');
  return number.startsWith('55') ? number : `55${number}`;
};
export const maskPhone = value => digits(value).slice(0, 11).replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
export const maskCpfCnpj = value => {
  const number = digits(value).slice(0, 14);
  return number.length <= 11
    ? number.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    : number.replace(/(\d{2})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1/$2').replace(/(\d{4})(\d{1,2})$/, '$1-$2');
};
export const maskPlate = value => String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
