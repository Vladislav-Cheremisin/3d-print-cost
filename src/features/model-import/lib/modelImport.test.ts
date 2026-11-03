import { describe, expect, it, vi } from 'vitest';
import { make3mf, make3mfSliced, makeAsciiStl, makeBinaryStl, CUBE_TRIANGLES } from './fixtures';
import { importFromMakerWorld } from './importFromUrl';
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

  it('бросает ошибку, если это не ZIP', () => {
    expect(() => parse3mf(new Uint8Array([0, 1, 2, 3]))).toThrow(
      /не ZIP/,
    );
  });
});

describe('estimateWeightGrams', () => {
  it('куб 1000 мм³ из PLA при заполнении 35% ≈ 0.4 г', () => {
    // 1 см³ × 1.24 г/см³ × 0.35 = 0.434 → округление до 0.1 г
    expect(estimateWeightGrams(1000, 1.24)).toBe(0.4);
  });

  it('100% заполнение — полный вес объёма', () => {
    expect(estimateWeightGrams(1000, 1.24, 1)).toBe(1.2);
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
    expect(result.weightGrams).toBe(0.4); // 1000 мм³ × 1.24 × 0.35
  });
});

describe('importFromMakerWorld', () => {
  it('отклоняет чужие домены', async () => {
    await expect(
      importFromMakerWorld('https://evil.com/model'),
    ).rejects.toThrow(/makerworld/);
  });

  it('извлекает вес и время из __NEXT_DATA__', async () => {
    const nextData = {
      props: {
        pageProps: {
          design: {
            title: 'Benchy',
            profile: { filamentWeight: 45.5, printTime: 3600 },
          },
        },
      },
    };
    const html = `<html><script id="__NEXT_DATA__" type="application/json">${JSON.stringify(nextData)}</script></html>`;
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(html, { status: 200 }),
    );
    const info = await importFromMakerWorld(
      'https://makerworld.com/en/models/12345',
      fetchMock,
    );
    expect(info.title).toBe('Benchy');
    expect(info.weightGrams).toBe(45.5);
    expect(info.printTimeHours).toBe(1);
  });

  it('бросает ошибку при недоступности страницы', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 500 }));
    await expect(
      importFromMakerWorld('https://makerworld.com/en/models/1', fetchMock),
    ).rejects.toThrow(/HTTP 500/);
  });
});
