import type { Currency } from './types';

export const getCurrencySymbol = (currency?: Currency): string => {
  switch (currency) {
    case 'SYP': return 'ل.س';
    case 'SAR': return 'ر.س';
    case 'EUR': return '€';
    case 'USD':
    default:
      return '$';
  }
};

export const formatMoney = (amount: number, currency?: Currency) => {
  return Math.round(amount).toLocaleString() + ' ' + getCurrencySymbol(currency);
};
