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

/** Доля заполнения (infill) по умолчанию */
export const DEFAULT_FILL_FRACTION = 0.35;

/**
 * Толщина сплошной оболочки по умолчанию, мм:
 * ~3 периметра при сопле 0.4 мм (стены + крышки + дно)
 */
export const DEFAULT_SHELL_MM = 1.2;

/**
 * Оценивает вес детали как слайсер: оболочка (стены/крышки/дно)
 * печатается сплошным пластиком, заполнением идёт только внутренность.
 *
 *   вес = ρ × (оболочка + (объём − оболочка) × infill)
 *
 * где оболочка ≈ площадь поверхности × толщину стенок.
 * Простая модель «доля от объёма» сильно занижает вес мелких деталей,
 * где стенки составляют бо́льшую часть материала.
 */
export function estimateWeightGrams(
  volumeMm3: number,
  surfaceAreaMm2: number,
  densityGCm3: number,
  infillFraction: number = DEFAULT_FILL_FRACTION,
  shellThicknessMm: number = DEFAULT_SHELL_MM,
): number {
  const shellMm3 = Math.min(surfaceAreaMm2 * shellThicknessMm, volumeMm3);
  const grams =
    ((shellMm3 + (volumeMm3 - shellMm3) * infillFraction) / 1000) *
    densityGCm3;
  return Math.round(grams * 10) / 10;
}

/** Разбирает файл модели и определяет вес (и время, если есть данные слайсера) */
export async function importModelFile(
  file: File,
  densityGCm3: number,
  infillFraction: number = DEFAULT_FILL_FRACTION,
  nozzleDiameterMm = 0.4,
): Promise<ModelImportResult> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const lower = file.name.toLowerCase();

  const shellThicknessMm = 3 * nozzleDiameterMm;

  if (lower.endsWith('.stl')) {
    const mesh = computeMeshVolume(parseStl(bytes));
    return {
      ...mesh,
      fileName: file.name,
      weightGrams: estimateWeightGrams(
        mesh.volumeMm3,
        mesh.surfaceAreaMm2,
        densityGCm3,
        infillFraction,
        shellThicknessMm,
      ),
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
      : infillFraction;
    return {
      ...mesh,
      fileName: file.name,
      weightGrams: estimateWeightGrams(
        mesh.volumeMm3,
        mesh.surfaceAreaMm2,
        densityGCm3,
        effectiveFill,
        shellThicknessMm,
      ),
      printTimeHours: null,
      fromSlicer: false,
    };
  }

  throw new Error('Поддерживаются только файлы .stl и .3mf');
}
