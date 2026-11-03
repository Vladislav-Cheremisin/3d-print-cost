import { describe, expect, it } from 'vitest';
import { accessories, printers } from '../index';
import { materials } from '@/entities/material';

describe('справочник принтеров', () => {
  it('не пустой', () => {
    expect(printers.length).toBeGreaterThan(5);
  });

  it('имеет уникальные id', () => {
    const ids = printers.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('все поля валидны', () => {
    for (const p of printers) {
      expect(p.name.length).toBeGreaterThan(0);
      expect(p.brand.length).toBeGreaterThan(0);
      expect(p.avgPowerWatts).toBeGreaterThan(0);
      expect(p.priceRub).toBeGreaterThan(0);
      expect(p.lifetimeHours).toBeGreaterThan(0);
      expect(typeof p.multicolorCapable).toBe('boolean');
    }
  });
});

describe('справочник доп. оборудования', () => {
  it('имеет уникальные id и валидные значения', () => {
    expect(accessories.length).toBeGreaterThan(0);
    const ids = accessories.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const a of accessories) {
      expect(a.name.length).toBeGreaterThan(0);
      expect(a.avgPowerWatts).toBeGreaterThan(0);
      expect(a.priceRub).toBeGreaterThan(0);
    }
  });
});

describe('справочник материалов', () => {
  it('имеет уникальные id и валидные цены', () => {
    expect(materials.length).toBeGreaterThan(5);
    const ids = materials.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const m of materials) {
      expect(m.name.length).toBeGreaterThan(0);
      expect(m.defaultPricePerKgRub).toBeGreaterThan(0);
    }
  });
});
