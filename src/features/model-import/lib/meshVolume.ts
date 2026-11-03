export interface Triangle {
  v0: [number, number, number];
  v1: [number, number, number];
  v2: [number, number, number];
}

export interface MeshInfo {
  /** Объём модели, мм³ */
  volumeMm3: number;
  triangleCount: number;
}

/**
 * Вычисляет объём триангулированной замкнутой сетки
 * по формуле знаковых тетраэдров: V = Σ dot(v0, cross(v1, v2)) / 6.
 */
export function computeMeshVolume(triangles: Triangle[]): MeshInfo {
  let volume = 0;
  for (const { v0, v1, v2 } of triangles) {
    volume +=
      (v0[0] * (v1[1] * v2[2] - v1[2] * v2[1]) -
        v0[1] * (v1[0] * v2[2] - v1[2] * v2[0]) +
        v0[2] * (v1[0] * v2[1] - v1[1] * v2[0])) /
      6;
  }
  return { volumeMm3: Math.abs(volume), triangleCount: triangles.length };
}
