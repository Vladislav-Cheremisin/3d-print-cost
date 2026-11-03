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
  const modelBytes = files[MODEL_PATH];
  if (!modelBytes) {
    throw new Error(`В архиве нет ${MODEL_PATH}`);
  }
  const xml = new TextDecoder().decode(modelBytes);

  const vertices: [number, number, number][] = [];
  const vertexRe =
    /<vertex\s[^>]*x="(-?[\d.eE+]+)"\s+y="(-?[\d.eE+]+)"\s+z="(-?[\d.eE+]+)"[^>]*\/>/g;
  let match: RegExpExecArray | null;
  while ((match = vertexRe.exec(xml)) !== null) {
    vertices.push([Number(match[1]), Number(match[2]), Number(match[3])]);
  }

  const triangles: Triangle[] = [];
  const triRe =
    /<triangle\s[^>]*v1="(\d+)"\s+v2="(\d+)"\s+v3="(\d+)"[^>]*\/>/g;
  while ((match = triRe.exec(xml)) !== null) {
    const v0 = vertices[Number(match[1])];
    const v1 = vertices[Number(match[2])];
    const v2 = vertices[Number(match[3])];
    if (v0 && v1 && v2) triangles.push({ v0, v1, v2 });
  }

  if (triangles.length === 0) {
    throw new Error('В 3MF не найдено треугольников сетки');
  }

  // Данные слайсера (если 3MF — проект Bambu Studio / OrcaSlicer)
  let slicer: SlicerInfo | null = null;
  const sliceInfoBytes = files[SLICE_INFO_PATH];
  if (sliceInfoBytes) {
    slicer = parseSlicerInfo(new TextDecoder().decode(sliceInfoBytes));
    const settingsBytes = files[PROJECT_SETTINGS_PATH];
    if (settingsBytes) {
      slicer.infillPercent = parseInfillPercent(
        new TextDecoder().decode(settingsBytes),
      );
    }
  }

  return { triangles, slicer };
}
