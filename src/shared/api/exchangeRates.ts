import type { ExchangeRates } from '@/entities/currency';

const API_URL = 'https://open.er-api.com/v6/latest/RUB';
const CACHE_KEY = 'printcost.exchange-rates';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // сутки

/** Запасные курсы на случай недоступности API (ориентировочные) */
export const FALLBACK_RATES: ExchangeRates = {
  RUB: 1,
  USD: 80,
  EUR: 88,
  CNY: 11,
};

interface CachedRates {
  timestamp: number;
  rates: ExchangeRates;
}

function readCache(storage: Storage): ExchangeRates | null {
  try {
    const raw = storage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedRates;
    if (Date.now() - parsed.timestamp > CACHE_TTL_MS) return null;
    return parsed.rates;
  } catch {
    return null;
  }
}

function writeCache(storage: Storage, rates: ExchangeRates): void {
  try {
    const entry: CachedRates = { timestamp: Date.now(), rates };
    storage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // переполненный/недоступный storage — не критично
  }
}

/**
 * Возвращает актуальные курсы валют (RUB-база).
 * Порядок: свежий кэш → API → запасные курсы.
 */
export async function fetchExchangeRates(
  storage: Storage = window.localStorage,
): Promise<ExchangeRates> {
  const cached = readCache(storage);
  if (cached) return cached;

  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = (await response.json()) as {
      rates?: Record<string, number>;
    };
    if (!data.rates?.RUB) throw new Error('Некорректный ответ API');

    // API отдаёт «сколько единиц валюты за 1 RUB» — инвертируем
    const rates: ExchangeRates = {
      RUB: 1,
      USD: 1 / data.rates.USD,
      EUR: 1 / data.rates.EUR,
      CNY: 1 / data.rates.CNY,
    };
    writeCache(storage, rates);
    return rates;
  } catch {
    return FALLBACK_RATES;
  }
}
