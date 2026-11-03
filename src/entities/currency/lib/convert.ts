import { roundTo } from '@/shared/lib/round/round';
import type { CurrencyCode, ExchangeRates } from '../model/types';

/**
 * Конвертирует сумму из одной валюты в другую.
 * Курсы заданы относительно RUB (сколько рублей за 1 единицу валюты).
 */
export function convertCurrency(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode,
  rates: ExchangeRates,
): number {
  if (from === to) return roundTo(amount);
  const fromRate = rates[from];
  const toRate = rates[to];
  if (!fromRate || !toRate || fromRate <= 0 || toRate <= 0) {
    return roundTo(amount);
  }
  return roundTo((amount * fromRate) / toRate);
}
