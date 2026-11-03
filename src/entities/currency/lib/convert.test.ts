import { describe, expect, it } from 'vitest';
import { convertCurrency } from './convert';
import type { ExchangeRates } from '../model/types';

const rates: ExchangeRates = { RUB: 1, USD: 80, EUR: 88, CNY: 11 };

describe('convertCurrency', () => {
  it('возвращает сумму без изменений при совпадающих валютах', () => {
    expect(convertCurrency(100, 'RUB', 'RUB', rates)).toBe(100);
  });

  it('конвертирует из рублей в валюту', () => {
    expect(convertCurrency(8000, 'RUB', 'USD', rates)).toBe(100);
  });

  it('конвертирует из валюты в рубли', () => {
    expect(convertCurrency(100, 'EUR', 'RUB', rates)).toBe(8800);
  });

  it('конвертирует между иностранными валютами через RUB', () => {
    // 100 USD = 8000 RUB = 727.27 CNY
    expect(convertCurrency(100, 'USD', 'CNY', rates)).toBe(727.27);
  });

  it('возвращает сумму при невалидных курсах', () => {
    const bad: ExchangeRates = { RUB: 1, USD: 0, EUR: 88, CNY: 11 };
    expect(convertCurrency(100, 'RUB', 'USD', bad)).toBe(100);
  });
});
