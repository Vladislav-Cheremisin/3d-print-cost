import type { Triangle } from './meshVolume';

const HEADER_BYTES = 84;
const TRIANGLE_BYTES = 50;

function isLikelyAscii(bytes: Uint8Array): boolean {
  // ASCII STL начинается со слова "solid" и не является бинарником по длине
  const head = new TextDecoder('ascii').decode(bytes.slice(0, 5));
  if (head !== 'solid') return false;
  const view = new DataView(bytes.buffer, bytes.byteOffset);
  if (bytes.length < HEADER_BYTES) return true;
  const declared = view.getUint32(80, true);
  return bytes.length !== HEADER_BYTES + declared * TRIANGLE_BYTES;
}

function parseBinary(bytes: Uint8Array): Triangle[] {
  if (bytes.length < HEADER_BYTES) {
    throw new Error('Файл слишком мал для бинарного STL');
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset);
  const count = view.getUint32(80, true);
  const expected = HEADER_BYTES + count * TRIANGLE_BYTES;
  if (bytes.length < expected) {
    throw new Error(
      `Повреждённый STL: заявлено ${count} треугольников, данных не хватает`,
    );
  }
  const triangles: Triangle[] = [];
  for (let i = 0; i < count; i++) {
    const o = HEADER_BYTES + i * TRIANGLE_BYTES + 12; // пропускаем нормаль
    triangles.push({
      v0: [view.getFloat32(o, true), view.getFloat32(o + 4, true), view.getFloat32(o + 8, true)],
      v1: [view.getFloat32(o + 12, true), view.getFloat32(o + 16, true), view.getFloat32(o + 20, true)],
      v2: [view.getFloat32(o + 24, true), view.getFloat32(o + 28, true), view.getFloat32(o + 32, true)],
    });
  }
  return triangles;
}

function parseAscii(text: string): Triangle[] {
  const vertexRe =
    /vertex\s+(-?[\d.eE+]+)\s+(-?[\d.eE+]+)\s+(-?[\d.eE+]+)/g;
  const vertices: [number, number, number][] = [];
  let match: RegExpExecArray | null;
  while ((match = vertexRe.exec(text)) !== null) {
    vertices.push([Number(match[1]), Number(match[2]), Number(match[3])]);
  }
  if (vertices.length === 0 || vertices.length % 3 !== 0) {
    throw new Error('Не удалось разобрать ASCII STL');
  }
  const triangles: Triangle[] = [];
  for (let i = 0; i < vertices.length; i += 3) {
    triangles.push({ v0: vertices[i], v1: vertices[i + 1], v2: vertices[i + 2] });
  }
  return triangles;
}

/** Разбирает STL (бинарный или ASCII) в список треугольников */
export function parseStl(bytes: Uint8Array): Triangle[] {
  if (isLikelyAscii(bytes)) {
    return parseAscii(new TextDecoder().decode(bytes));
  }
  return parseBinary(bytes);
}
