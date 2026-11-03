import { describe, expect, it } from 'vitest';
import { roundTo } from './round';

describe('roundTo', () => {
  it('округляет до двух знаков по умолчанию', () => {
    expect(roundTo(1.005)).toBe(1.01);
    expect(roundTo(1.004)).toBe(1);
  });

  it('поддерживает произвольное число знаков', () => {
    expect(roundTo(1.23456, 3)).toBe(1.235);
    expect(roundTo(1.5, 0)).toBe(2);
  });

  it('устойчив к артефактам float', () => {
    expect(roundTo(0.1 + 0.2)).toBe(0.3);
  });
});
