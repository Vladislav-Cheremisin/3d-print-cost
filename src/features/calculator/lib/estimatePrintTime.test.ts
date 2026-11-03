import { describe, expect, it } from 'vitest';
import { estimatePrintTimeHours } from './estimatePrintTime';

const base = {
  printerId: 'bambu-a1',
  materialId: 'pla',
  nozzleDiameter: 0.4,
  partWeightGrams: 120,
};

describe('estimatePrintTimeHours', () => {
  it('оценивает типичный сценарий: 120 г PLA на Bambu A1', () => {
    // V = 120/1.24×1000 ≈ 96774 мм³; flow = min(28,16) = 16 мм³/с
    // экструзия ≈ 6048 с ≈ 1.68 ч; /0.65 ≈ 2.58 ч + 5 мин ≈ 2.67 ч
    const hours = estimatePrintTimeHours(base);
    expect(hours).not.toBeNull();
    expect(hours!).toBeGreaterThan(2);
    expect(hours!).toBeLessThan(3.5);
  });

  it('медленный материал (TPU) увеличивает время', () => {
    const pla = estimatePrintTimeHours(base)!;
    const tpu = estimatePrintTimeHours({ ...base, materialId: 'tpu' })!;
    expect(tpu).toBeGreaterThan(pla * 3);
  });

  it('большее сопло сокращает время', () => {
    const n04 = estimatePrintTimeHours(base)!;
    const n08 = estimatePrintTimeHours({ ...base, nozzleDiameter: 0.8 })!;
    expect(n08).toBeLessThan(n04);
  });

  it('больше вес — больше время', () => {
    const small = estimatePrintTimeHours({ ...base, partWeightGrams: 50 })!;
    const big = estimatePrintTimeHours({ ...base, partWeightGrams: 500 })!;
    expect(big).toBeGreaterThan(small);
  });

  it('возвращает null без веса или при неизвестных id', () => {
    expect(
      estimatePrintTimeHours({ ...base, partWeightGrams: 0 }),
    ).toBeNull();
    expect(
      estimatePrintTimeHours({ ...base, printerId: 'unknown' }),
    ).toBeNull();
    expect(
      estimatePrintTimeHours({ ...base, materialId: 'unknown' }),
    ).toBeNull();
  });
});
