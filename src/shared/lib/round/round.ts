/**
 * Округляет число до указанного количества знаков после запятой.
 * Используется для денежных значений, чтобы избежать артефактов float.
 */
export function roundTo(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}
