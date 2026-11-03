import { computeMeshVolume, type MeshInfo } from './meshVolume';
import { parse3mf } from './parse3mf';
import { parseStl } from './parseStl';

export interface ModelImportResult extends MeshInfo {
  fileName: string;
  /** Вес детали, г — точный из слайсера либо оценка по объёму */
  weightGrams: number;
  /** Время печати, ч — только если прочитано из файла слайсера */
  printTimeHours: number | null;
  /** true, если вес/время взяты из данных слайсера в 3MF (точные) */
  fromSlicer: boolean;
}

/** Доля заполнения по умолчанию (стены + крышки + ~20% инфилла) */
export const DEFAULT_FILL_FRACTION = 0.35;

/**
 * Оценивает вес детали по объёму сплошной модели.
 * fillFraction — доля материала после слайсинга (заполнение + стенки).
 */
export function estimateWeightGrams(
  volumeMm3: number,
  densityGCm3: number,
  fillFraction: number = DEFAULT_FILL_FRACTION,
): number {
  const grams = (volumeMm3 / 1000) * densityGCm3 * fillFraction;
  return Math.round(grams * 10) / 10;
}

/** Разбирает файл модели и определяет вес (и время, если есть данные слайсера) */
export async function importModelFile(
  file: File,
  densityGCm3: number,
  fillFraction: number = DEFAULT_FILL_FRACTION,
): Promise<ModelImportResult> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const lower = file.name.toLowerCase();

  if (lower.endsWith('.stl')) {
    const mesh = computeMeshVolume(parseStl(bytes));
    return {
      ...mesh,
      fileName: file.name,
      weightGrams: estimateWeightGrams(mesh.volumeMm3, densityGCm3, fillFraction),
      printTimeHours: null,
      fromSlicer: false,
    };
  }

  if (lower.endsWith('.3mf')) {
    const { triangles, slicer } = parse3mf(bytes);
    const mesh = computeMeshVolume(triangles);

    if (slicer?.weightGrams) {
      // Точные данные слайсера: инфилл уже учтён в весе
      return {
        ...mesh,
        fileName: file.name,
        weightGrams: Math.round(slicer.weightGrams * 10) / 10,
        printTimeHours: slicer.timeSeconds
          ? Math.round((slicer.timeSeconds / 3600) * 100) / 100
          : null,
        fromSlicer: true,
      };
    }

    // Голая модель: оценка по объёму; если инфилл есть в настройках — берём его
    const effectiveFill = slicer?.infillPercent
      ? Math.max(slicer.infillPercent / 100, 0.05)
      : fillFraction;
    return {
      ...mesh,
      fileName: file.name,
      weightGrams: estimateWeightGrams(mesh.volumeMm3, densityGCm3, effectiveFill),
      printTimeHours: null,
      fromSlicer: false,
    };
  }

  throw new Error('Поддерживаются только файлы .stl и .3mf');
}
