export interface Triangle {
  v0: [number, number, number];
  v1: [number, number, number];
  v2: [number, number, number];
}

export interface MeshInfo {
  /** Объём модели, мм³ */
  volumeMm3: number;
  /** Площадь поверхности сетки, мм² (нужна для оценки веса стенок) */
  surfaceAreaMm2: number;
  triangleCount: number;
}

/**
 * Вычисляет объём триангулированной замкнутой сетки
 * по формуле знаковых тетраэдров: V = Σ dot(v0, cross(v1, v2)) / 6,
 * и площадь поверхности — сумма площадей треугольников.
 */
export function computeMeshVolume(triangles: Triangle[]): MeshInfo {
  let volume = 0;
  let surfaceArea = 0;
  for (const { v0, v1, v2 } of triangles) {
    volume +=
      (v0[0] * (v1[1] * v2[2] - v1[2] * v2[1]) -
        v0[1] * (v1[0] * v2[2] - v1[2] * v2[0]) +
        v0[2] * (v1[0] * v2[1] - v1[1] * v2[0])) /
      6;
    // площадь = |cross(v1 - v0, v2 - v0)| / 2
    const ax = v1[0] - v0[0];
    const ay = v1[1] - v0[1];
    const az = v1[2] - v0[2];
    const bx = v2[0] - v0[0];
    const by = v2[1] - v0[1];
    const bz = v2[2] - v0[2];
    const cx = ay * bz - az * by;
    const cy = az * bx - ax * bz;
    const cz = ax * by - ay * bx;
    surfaceArea += Math.sqrt(cx * cx + cy * cy + cz * cz) / 2;
  }
  return {
    volumeMm3: Math.abs(volume),
    surfaceAreaMm2: surfaceArea,
    triangleCount: triangles.length,
  };
}
