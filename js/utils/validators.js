import { digits } from './masks.js';

function validateDocument(value, sizes) {
  const number = digits(value);
  if (!sizes.includes(number.length) || /^(\d)\1+$/.test(number)) return false;
  if (number.length === 11) {
    const calc = length => {
      let sum = 0;
      for (let i = 0; i < length; i += 1) sum += Number(number[i]) * (length + 1 - i);
      const digit = (sum * 10) % 11;
      return digit === 10 ? 0 : digit;
    };
    return calc(9) === Number(number[9]) && calc(10) === Number(number[10]);
  }
  const calc = length => {
    const weights = length === 12 ? [5,4,3,2,9,8,7,6,5,4,3,2] : [6,5,4,3,2,9,8,7,6,5,4,3,2];
    const sum = weights.reduce((total, weight, index) => total + Number(number[index]) * weight, 0);
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  return calc(12) === Number(number[12]) && calc(13) === Number(number[13]);
}

export const isCpfCnpj = value => validateDocument(value, [11, 14]);
export const isEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
export const isPhone = value => [10, 11, 12, 13].includes(digits(value).length);
export const isPlate = value => /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(String(value || '').toUpperCase());
