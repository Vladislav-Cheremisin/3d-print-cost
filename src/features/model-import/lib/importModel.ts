import { computeMeshVolume, type MeshInfo } from './meshVolume';
import { parse3mf } from './parse3mf';
import { parseStl } from './parseStl';

export interface ModelImportResult extends MeshInfo {
  fileName: string;
  /** Оценка веса, г (объём × плотность × доля заполнения) */
  weightGrams: number;
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

/** Разбирает файл модели и оценивает вес */
export async function importModelFile(
  file: File,
  densityGCm3: number,
  fillFraction: number = DEFAULT_FILL_FRACTION,
): Promise<ModelImportResult> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const lower = file.name.toLowerCase();

  let mesh: MeshInfo;
  if (lower.endsWith('.stl')) {
    mesh = computeMeshVolume(parseStl(bytes));
  } else if (lower.endsWith('.3mf')) {
    mesh = computeMeshVolume(parse3mf(bytes));
  } else {
    throw new Error('Поддерживаются только файлы .stl и .3mf');
  }

  return {
    ...mesh,
    fileName: file.name,
    weightGrams: estimateWeightGrams(mesh.volumeMm3, densityGCm3, fillFraction),
  };
}
