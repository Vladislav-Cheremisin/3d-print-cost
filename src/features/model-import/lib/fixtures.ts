// Тестовые фикстуры: куб 10×10×10 мм, объём 1000 мм³, 12 треугольников
import { zipSync, strToU8, unzipSync } from 'fflate';

/** Куб в виде 12 треугольников (2 на грань) */
export const CUBE_TRIANGLES: [number, number, number][][] = (() => {
  const v = [
    [0, 0, 0], [10, 0, 0], [10, 10, 0], [0, 10, 0],
    [0, 0, 10], [10, 0, 10], [10, 10, 10], [0, 10, 10],
  ] as [number, number, number][];
  const faces = [
    [0, 3, 2], [0, 2, 1], // bottom
    [4, 5, 6], [4, 6, 7], // top
    [0, 1, 5], [0, 5, 4], // front
    [2, 3, 7], [2, 7, 6], // back
    [0, 4, 7], [0, 7, 3], // left
    [1, 2, 6], [1, 6, 5], // right
  ];
  return faces.map(([a, b, c]) => [v[a], v[b], v[c]]);
})();

export function makeBinaryStl(): Uint8Array {
  const count = CUBE_TRIANGLES.length;
  const bytes = new Uint8Array(84 + count * 50);
  const view = new DataView(bytes.buffer);
  view.setUint32(80, count, true);
  CUBE_TRIANGLES.forEach((tri, i) => {
    const o = 84 + i * 50; // нормаль оставляем нулевой — парсеру не нужна
    tri.forEach((vertex, vi) => {
      vertex.forEach((coord, ci) => {
        view.setFloat32(o + 12 + vi * 12 + ci * 4, coord, true);
      });
    });
  });
  return bytes;
}

export function makeAsciiStl(): string {
  const lines = ['solid cube'];
  for (const [v0, v1, v2] of CUBE_TRIANGLES) {
    lines.push(' facet normal 0 0 0', '  outer loop');
    for (const v of [v0, v1, v2]) {
      lines.push(`   vertex ${v.join(' ')}`);
    }
    lines.push('  endloop', ' endfacet');
  }
  lines.push('endsolid cube');
  return lines.join('\n');
}

export function make3mf(): Uint8Array {
  const vertices = [
    [0, 0, 0], [10, 0, 0], [10, 10, 0], [0, 10, 0],
    [0, 0, 10], [10, 0, 10], [10, 10, 10], [0, 10, 10],
  ];
  const vertexXml = vertices
    .map(([x, y, z]) => `<vertex x="${x}" y="${y}" z="${z}"/>`)
    .join('');
  const triXml = [
    [0, 3, 2], [0, 2, 1], [4, 5, 6], [4, 6, 7],
    [0, 1, 5], [0, 5, 4], [2, 3, 7], [2, 7, 6],
    [0, 4, 7], [0, 7, 3], [1, 2, 6], [1, 6, 5],
  ]
    .map(([a, b, c]) => `<triangle v1="${a}" v2="${b}" v3="${c}"/>`)
    .join('');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<model><resources><object id="1" type="model"><mesh>
<vertices>${vertexXml}</vertices>
<triangles>${triXml}</triangles>
</mesh></object></resources></model>`;
  return zipSync({ '3D/3Dmodel.model': strToU8(xml) });
}

/** 3MF-проект слайсера: сетка + метаданные Bambu Studio / OrcaSlicer */
export function make3mfSliced(): Uint8Array {
  const base = make3mf();
  // распакуем и дополним метаданными
  // (файл маленький, проще собрать заново через fflate)
  return zipSync({
    '3D/3Dmodel.model': unzipSync(base)['3D/3Dmodel.model'],
    'Metadata/slice_info.config': strToU8(
      `<?xml version="1.0"?>
<config><plate>
<metadata key="index" value="1"/>
<metadata key="prediction" value="3696"/>
<filament id="1" type="PLA" used_m="4.52" used_g="14.30"/>
<filament id="2" type="PLA" used_m="1.10" used_g="3.40"/>
</plate></config>`,
    ),
    'Metadata/project_settings.config': strToU8(
      JSON.stringify({ sparse_infill_density: '15%' }),
    ),
  });
}
