import { unzipSync } from 'fflate';
import type { Triangle } from './meshVolume';

const MODEL_PATH = '3D/3Dmodel.model';

/**
 * Разбирает 3MF (ZIP с XML-сеткой) в список треугольников.
 * Учитывает только вершины и треугольники первого объекта;
 * трансформации объектов не применяются (ограничение MVP).
 */
export function parse3mf(bytes: Uint8Array): Triangle[] {
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
  return triangles;
}
