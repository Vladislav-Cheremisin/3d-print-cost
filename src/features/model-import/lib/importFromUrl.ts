export interface MakerWorldModelInfo {
  title: string | null;
  /** Вес из карточки модели, г (если удалось извлечь) */
  weightGrams: number | null;
  /** Время печати, ч (если удалось извлечь) */
  printTimeHours: number | null;
}

// CORS не даёт запросить MakerWorld напрямую из браузера — идём через прокси
const PROXY = 'https://api.allorigins.win/raw?url=';

/** Извлекает JSON из <script id="__NEXT_DATA__"> страницы */
function extractNextData(html: string): unknown {
  const match = html.match(
    /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/,
  );
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

/** Рекурсивно ищет числовые поля с подходящими именами */
function findNumericField(
  node: unknown,
  names: string[],
  min: number,
  max: number,
  depth = 0,
): number | null {
  if (depth > 12 || node === null || typeof node !== 'object') return null;
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    if (
      typeof value === 'number' &&
      names.some((n) => key.toLowerCase().includes(n)) &&
      value >= min &&
      value <= max
    ) {
      return value;
    }
  }
  for (const value of Object.values(node as Record<string, unknown>)) {
    const found = findNumericField(value, names, min, max, depth + 1);
    if (found !== null) return found;
  }
  return null;
}

function findTitle(node: unknown, depth = 0): string | null {
  if (depth > 8 || node === null || typeof node !== 'object') return null;
  const record = node as Record<string, unknown>;
  if (typeof record.title === 'string' && record.title.length > 0) {
    return record.title;
  }
  for (const value of Object.values(record)) {
    const found = findTitle(value, depth + 1);
    if (found) return found;
  }
  return null;
}

/**
 * Загружает страницу модели MakerWorld и пытается извлечь
 * вес филамента и время печати из встроенного JSON.
 * Данные помечаются как ориентировочные — структура страницы может меняться.
 */
export async function importFromMakerWorld(
  url: string,
  fetchFn: typeof fetch = fetch,
): Promise<MakerWorldModelInfo> {
  if (!/^https?:\/\/(www\.)?makerworld\.com\//.test(url.trim())) {
    throw new Error('Поддерживаются только ссылки на makerworld.com');
  }
  const response = await fetchFn(PROXY + encodeURIComponent(url.trim()));
  if (!response.ok) {
    throw new Error(`Не удалось загрузить страницу (HTTP ${response.status})`);
  }
  const html = await response.text();
  const data = extractNextData(html);
  if (!data) {
    throw new Error('Не удалось разобрать данные страницы');
  }

  // MakerWorld хранит время в секундах
  const timeSeconds = findNumericField(
    data,
    ['printtime', 'print_time', 'prediction'],
    60,
    60 * 24 * 365,
  );

  return {
    title: findTitle(data),
    weightGrams: findNumericField(
      data,
      ['weight', 'filamentused', 'filament_g'],
      0.5,
      100000,
    ),
    printTimeHours: timeSeconds !== null ? timeSeconds / 3600 : null,
  };
}
