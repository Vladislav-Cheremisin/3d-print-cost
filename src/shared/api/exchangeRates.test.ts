import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FALLBACK_RATES, fetchExchangeRates } from './exchangeRates';

function makeStorage(initial: Record<string, string> = {}): Storage {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
    key: () => null,
    get length() {
      return map.size;
    },
  } as Storage;
}

const apiResponse = { rates: { RUB: 1, USD: 0.0125, EUR: 0.011, CNY: 0.09 } };

describe('fetchExchangeRates', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('получает курсы из API и инвертирует их к RUB-базе', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(apiResponse), { status: 200 }),
    );
    const rates = await fetchExchangeRates(makeStorage());
    expect(rates.RUB).toBe(1);
    expect(rates.USD).toBeCloseTo(80);
    expect(rates.EUR).toBeCloseTo(90.91, 1);
    expect(rates.CNY).toBeCloseTo(11.11, 1);
  });

  it('кэширует курсы и не дёргает API повторно', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(apiResponse), { status: 200 }),
    );
    const storage = makeStorage();
    await fetchExchangeRates(storage);
    await fetchExchangeRates(storage);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('игнорирует просроченный кэш', async () => {
    const stale = JSON.stringify({
      timestamp: Date.now() - 25 * 60 * 60 * 1000,
      rates: FALLBACK_RATES,
    });
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(apiResponse), { status: 200 }),
    );
    const rates = await fetchExchangeRates(
      makeStorage({ 'printcost.exchange-rates': stale }),
    );
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(rates.USD).toBeCloseTo(80);
  });

  it('возвращает запасные курсы при ошибке сети', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('network down'));
    const rates = await fetchExchangeRates(makeStorage());
    expect(rates).toEqual(FALLBACK_RATES);
  });

  it('возвращает запасные курсы при некорректном ответе', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response('{"unexpected": true}', { status: 200 }),
    );
    const rates = await fetchExchangeRates(makeStorage());
    expect(rates).toEqual(FALLBACK_RATES);
  });
});
