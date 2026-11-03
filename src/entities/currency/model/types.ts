export const CURRENCIES = ['RUB', 'USD', 'EUR', 'CNY'] as const;

export type CurrencyCode = (typeof CURRENCIES)[number];

/** Курсы валют относительно базовой (RUB): сколько рублей стоит 1 единица валюты */
export type ExchangeRates = Record<CurrencyCode, number>;

export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  RUB: '₽',
  USD: '$',
  EUR: '€',
  CNY: '¥',
};
