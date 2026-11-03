import { unzipSync } from 'fflate';
import type { Triangle } from './meshVolume';

const MODEL_PATH = '3D/3Dmodel.model';
const SLICE_INFO_PATH = 'Metadata/slice_info.config';
const PROJECT_SETTINGS_PATH = 'Metadata/project_settings.config';

/** Данные, которые слайсер (Bambu Studio / OrcaSlicer) пишет в 3MF */
export interface SlicerInfo {
  /** Точный вес филамента по всем катушкам, г */
  weightGrams: number | null;
  /** Оценка времени печати, секунды */
  timeSeconds: number | null;
  /** Заполнение (infill), % */
  infillPercent: number | null;
}

export interface Parsed3mf {
  triangles: Triangle[];
  /** Присутствует, только если 3MF сохранён слайсером */
  slicer: SlicerInfo | null;
}

function parseSlicerInfo(xml: string): SlicerInfo {
  // <filament ... used_g="14.30" .../> — суммируем все катушки
  let weightGrams = 0;
  const filamentRe = /<filament\s[^>]*used_g="([\d.]+)"/g;
  let match: RegExpExecArray | null;
  while ((match = filamentRe.exec(xml)) !== null) {
    weightGrams += Number(match[1]);
  }

  // <metadata key="prediction" value="3696"/> — время в секундах
  const timeMatch = xml.match(
    /<metadata\s+key="prediction"\s+value="(\d+)"/,
  );

  return {
    weightGrams: weightGrams > 0 ? weightGrams : null,
    timeSeconds: timeMatch ? Number(timeMatch[1]) : null,
    infillPercent: null,
  };
}

function parseInfillPercent(json: string): number | null {
  try {
    const settings = JSON.parse(json) as Record<string, unknown>;
    const raw = settings.sparse_infill_density;
    if (typeof raw !== 'string') return null;
    const value = Number(raw.replace('%', ''));
    return Number.isFinite(value) && value >= 0 && value <= 100
      ? value
      : null;
  } catch {
    return null;
  }
}

/**
 * Разбирает 3MF (ZIP с XML-сеткой) в список треугольников.
 * Если файл сохранён слайсером, дополнительно извлекает точные
 * вес, время печати и заполнение.
 * Трансформации объектов не применяются (ограничение MVP).
 */
export function parse3mf(bytes: Uint8Array): Parsed3mf {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes);
  } catch {
    throw new Error('Не удалось распаковать 3MF: это не ZIP-архив');
  }
  // Читаем числовой атрибут из тега: порядок атрибутов в файлах
  // разных экспортёров не гарантирован, поэтому ищем каждый отдельно
  const readAttr = (tag: string, name: string): number | null => {
    const match = tag.match(
      new RegExp(`(?:^|[\\s"'])${name}\\s*=\\s*"(-?[\\d.eE+]+)"`),
    );
    return match ? Number(match[1]) : null;
  };

  // Разбирает один .model XML в треугольники.
  // Индексы вершин у треугольников — локальные для каждого файла,
  // поэтому каждый XML разбирается независимо
  const parseModelXml = (xml: string): Triangle[] => {
    // Учитываем возможные XML-префиксы неймспейсов (<m:vertex ...>)
    const vertices: [number, number, number][] = [];
    const vertexRe = /<(?:[\w.-]+:)?vertex\b[^>]*>/g;
    let match: RegExpExecArray | null;
    while ((match = vertexRe.exec(xml)) !== null) {
      const x = readAttr(match[0], 'x');
      const y = readAttr(match[0], 'y');
      const z = readAttr(match[0], 'z');
      if (x !== null && y !== null && z !== null) vertices.push([x, y, z]);
    }

    const result: Triangle[] = [];
    const triRe = /<(?:[\w.-]+:)?triangle\b[^>]*>/g;
    while ((match = triRe.exec(xml)) !== null) {
      const i1 = readAttr(match[0], 'v1');
      const i2 = readAttr(match[0], 'v2');
      const i3 = readAttr(match[0], 'v3');
      if (i1 === null || i2 === null || i3 === null) continue;
      const v0 = vertices[i1];
      const v1 = vertices[i2];
      const v2 = vertices[i3];
      if (v0 && v1 && v2) result.push({ v0, v1, v2 });
    }
    return result;
  };

  // Стандартный путь — 3D/3Dmodel.model, но разные экспортёры
  // могут менять регистр или вкладывать подкаталоги. Кроме того,
  // по production-расширению сетка может лежать не в главном файле,
  // а в дочерних (3D/Objects/object_N.model) — читаем их все.
  const modelKeys = Object.keys(files).filter((k) =>
    k.toLowerCase().endsWith('.model'),
  );
  if (modelKeys.length === 0) {
    throw new Error(
      'В архиве не найден файл модели (.model). ' +
        'Возможно, это не 3MF-модель, а проект другого формата',
    );
  }
  modelKeys.sort(
    (a, b) =>
      Number(b.toLowerCase() === MODEL_PATH.toLowerCase()) -
      Number(a.toLowerCase() === MODEL_PATH.toLowerCase()),
  );

  const decoder = new TextDecoder();
  const triangles = modelKeys.flatMap((key) =>
    parseModelXml(decoder.decode(files[key])),
  );

  if (triangles.length === 0) {
    throw new Error('В 3MF не найдено треугольников сетки');
  }

  // Данные слайсера (если 3MF — проект Bambu Studio / OrcaSlicer)
  const findMeta = (suffix: string) =>
    Object.entries(files).find(([k]) =>
      k.toLowerCase().endsWith(suffix),
    )?.[1];

  let slicer: SlicerInfo | null = null;
  const sliceInfoBytes = findMeta(SLICE_INFO_PATH.toLowerCase());
  if (sliceInfoBytes) {
    slicer = parseSlicerInfo(decoder.decode(sliceInfoBytes));
  }
  // Заполнение читаем и без slice_info: файлы моделей с MakerWorld
  // содержат project_settings, но не содержат данных о нарезке
  const settingsBytes = findMeta(PROJECT_SETTINGS_PATH.toLowerCase());
  if (settingsBytes) {
    const infillPercent = parseInfillPercent(decoder.decode(settingsBytes));
    if (infillPercent !== null) {
      slicer = slicer ?? { weightGrams: null, timeSeconds: null, infillPercent };
      slicer.infillPercent = infillPercent;
    }
  }

  return { triangles, slicer };
}
