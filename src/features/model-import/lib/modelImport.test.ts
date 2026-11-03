import { describe, expect, it } from 'vitest';
import { make3mf, make3mfShuffledAttrs, make3mfSliced, make3mfSplitObjects, makeAsciiStl, makeBinaryStl, CUBE_TRIANGLES } from './fixtures';
import { estimateWeightGrams } from './importModel';
import { computeMeshVolume } from './meshVolume';
import { parse3mf } from './parse3mf';
import { parseStl } from './parseStl';

describe('computeMeshVolume', () => {
  it('считает объём куба 10×10×10 = 1000 мм³', () => {
    const mesh = computeMeshVolume(
      CUBE_TRIANGLES.map(([v0, v1, v2]) => ({ v0, v1, v2 })),
    );
    expect(mesh.volumeMm3).toBeCloseTo(1000, 5);
    expect(mesh.triangleCount).toBe(12);
  });

  it('считает площадь поверхности куба: 6 граней × 100 мм² = 600 мм²', () => {
    const mesh = computeMeshVolume(
      CUBE_TRIANGLES.map(([v0, v1, v2]) => ({ v0, v1, v2 })),
    );
    expect(mesh.surfaceAreaMm2).toBeCloseTo(600, 5);
  });
});

describe('parseStl', () => {
  it('разбирает бинарный STL', () => {
    const triangles = parseStl(makeBinaryStl());
    expect(triangles).toHaveLength(12);
    expect(triangles[0].v0).toEqual([0, 0, 0]);
  });

  it('разбирает ASCII STL', () => {
    const bytes = new TextEncoder().encode(makeAsciiStl());
    const triangles = parseStl(bytes);
    expect(triangles).toHaveLength(12);
  });

  it('объём из бинарного STL — 1000 мм³', () => {
    const mesh = computeMeshVolume(parseStl(makeBinaryStl()));
    expect(mesh.volumeMm3).toBeCloseTo(1000, 5);
  });

  it('бросает ошибку на битом файле', () => {
    expect(() => parseStl(new Uint8Array([1, 2, 3]))).toThrow();
  });

  it('бинарный STL со словом "solid" в заголовке читается как бинарный', () => {
    const bytes = makeBinaryStl();
    // многие экспортёры пишут "solid" в 80-байтный заголовок бинарника
    bytes.set(new TextEncoder().encode('solid exported by SomeSlicer'), 0);
    const triangles = parseStl(bytes);
    expect(triangles).toHaveLength(12);
    expect(computeMeshVolume(triangles).volumeMm3).toBeCloseTo(1000, 5);
  });

  it('NaN-координаты дают понятную ошибку, а не NaN-объём', () => {
    const bytes = makeBinaryStl();
    const view = new DataView(bytes.buffer);
    // портим координаты каждого треугольника (нормаль остаётся)
    for (let i = 0; i < 12; i++) {
      const o = 84 + i * 50 + 12;
      for (let c = 0; c < 9; c++) view.setFloat32(o + c * 4, NaN, true);
    }
    expect(() => parseStl(bytes)).toThrow(/координаты/);
  });
});

describe('parse3mf', () => {
  it('разбирает 3MF и считает объём 1000 мм³', () => {
    const { triangles, slicer } = parse3mf(make3mf());
    const mesh = computeMeshVolume(triangles);
    expect(mesh.volumeMm3).toBeCloseTo(1000, 5);
    expect(mesh.triangleCount).toBe(12);
    expect(slicer).toBeNull();
  });

  it('извлекает данные слайсера: вес по катушкам, время, инфилл', () => {
    const { slicer } = parse3mf(make3mfSliced());
    expect(slicer).not.toBeNull();
    // 14.30 + 3.40 г по двум катушкам
    expect(slicer!.weightGrams).toBeCloseTo(17.7, 5);
    expect(slicer!.timeSeconds).toBe(3696);
    expect(slicer!.infillPercent).toBe(15);
  });

  it('читает атрибуты в любом порядке и с префиксом неймспейса', () => {
    const { triangles } = parse3mf(make3mfShuffledAttrs());
    expect(computeMeshVolume(triangles).volumeMm3).toBeCloseTo(1000, 5);
  });

  it('читает сетку из дочерних .model (production-расширение, MakerWorld)', () => {
    const { triangles } = parse3mf(make3mfSplitObjects());
    expect(computeMeshVolume(triangles).volumeMm3).toBeCloseTo(1000, 5);
  });

  it('бросает ошибку, если это не ZIP', () => {
    expect(() => parse3mf(new Uint8Array([0, 1, 2, 3]))).toThrow(
      /не ZIP/,
    );
  });
});

describe('estimateWeightGrams', () => {
  // Куб 10 мм: объём 1000 мм³, поверхность 600 мм²
  // Оболочка 1.2 мм: 600 × 1.2 = 720 мм³, внутренность 280 мм³

  it('100% заполнение — полный вес объёма', () => {
    // (720 + 280 × 1) × 1.24 / 1000 = 1.24 → 1.2
    expect(estimateWeightGrams(1000, 600, 1.24, 1)).toBe(1.2);
  });

  it('мелкая деталь с 35% заполнения: стенки весят больше инфилла', () => {
    // (720 + 280 × 0.35) × 1.24 / 1000 = 818 × 1.24 / 1000 ≈ 1.0
    expect(estimateWeightGrams(1000, 600, 1.24, 0.35)).toBe(1.0);
  });

  it('крупная деталь: вес ближе к доле заполнения от объёма', () => {
    // Куб 100 мм: объём 1 000 000 мм³, поверхность 60 000 мм²
    // Оболочка: 72 000 мм³, внутренность 928 000 мм³
    // (72 000 + 928 000 × 0.15) × 1.24 / 1000 = 261.888 → 261.9
    expect(estimateWeightGrams(1_000_000, 60_000, 1.24, 0.15)).toBe(261.9);
  });

  it('оболочка не может превысить объём модели', () => {
    // Тонкая пластина: оболочка ограничивается объёмом
    const w = estimateWeightGrams(100, 500, 1.24, 0.35);
    expect(w).toBeCloseTo(estimateWeightGrams(100, 0, 1.24, 1), 5);
  });
});

describe('importModelFile', () => {
  function fakeFile(name: string, bytes: Uint8Array): File {
    return {
      name,
      arrayBuffer: () =>
        Promise.resolve(
          bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length),
        ),
    } as File;
  }

  it('3MF из слайсера: точный вес и время из метаданных', async () => {
    const { importModelFile } = await import('./importModel');
    const result = await importModelFile(
      fakeFile('model.3mf', make3mfSliced()),
      1.24,
    );
    expect(result.fromSlicer).toBe(true);
    expect(result.weightGrams).toBeCloseTo(17.7, 5);
    expect(result.printTimeHours).toBeCloseTo(1.03, 2);
  });

  it('голая 3MF: оценка по объёму, fromSlicer = false', async () => {
    const { importModelFile } = await import('./importModel');
    const result = await importModelFile(fakeFile('model.3mf', make3mf()), 1.24);
    expect(result.fromSlicer).toBe(false);
    expect(result.printTimeHours).toBeNull();
    // оболочка 720 мм³ + инфилл 280 × 0.35 мм³ → ≈ 1.0 г
    expect(result.weightGrams).toBe(1.0);
  });
});
