import { describe, expect, it } from 'vitest';
import { calculateCost } from './calculateCost';
import type { CalculationInput } from '../model/types';

/** Базовый ввод: только обязательные поля, всё опциональное выключено */
const baseInput: CalculationInput = {
  filamentPricePerKg: 2000,
  partWeightGrams: 100,
  printTimeHours: null,
  isMulticolor: false,
  multicolorWastePercent: 0,
  includeElectricity: false,
  electricityTariffPerKwh: null,
  totalPowerWatts: null,
  includeDepreciation: false,
  equipmentTotalCost: null,
  equipmentLifetimeHours: 5000,
  extraCosts: [],
  markupPercent: 0,
  minSalePrice: 0,
};

describe('calculateCost', () => {
  it('считает только материал, если опции выключены', () => {
    // 100 г × 2000 ₽/кг = 200 ₽
    const result = calculateCost(baseInput);
    expect(result.material).toBe(200);
    expect(result.electricity).toBe(0);
    expect(result.depreciation).toBe(0);
    expect(result.extras).toBe(0);
    expect(result.total).toBe(200);
    expect(result.priceWithMarkup).toBe(200);
  });

  it('учитывает отходы при многоцветной печати', () => {
    // 200 ₽ + 40% отходов = 280 ₽
    const result = calculateCost({
      ...baseInput,
      isMulticolor: true,
      multicolorWastePercent: 40,
    });
    expect(result.material).toBe(280);
    expect(result.total).toBe(280);
  });

  it('считает электроэнергию при включённом чекбоксе', () => {
    // 250 Вт × 5 ч × 6 ₽/кВт·ч = 7.5 ₽
    const result = calculateCost({
      ...baseInput,
      includeElectricity: true,
      printTimeHours: 5,
      totalPowerWatts: 250,
      electricityTariffPerKwh: 6,
    });
    expect(result.electricity).toBe(7.5);
    expect(result.total).toBe(207.5);
  });

  it('не считает электроэнергию без времени печати', () => {
    const result = calculateCost({
      ...baseInput,
      includeElectricity: true,
      totalPowerWatts: 250,
      electricityTariffPerKwh: 6,
    });
    expect(result.electricity).toBe(0);
  });

  it('не считает электроэнергию при выключенном чекбоксе', () => {
    const result = calculateCost({
      ...baseInput,
      printTimeHours: 5,
      totalPowerWatts: 250,
      electricityTariffPerKwh: 6,
    });
    expect(result.electricity).toBe(0);
  });

  it('считает амортизацию: стоимость / ресурс × время', () => {
    // 50000 ₽ / 5000 ч × 10 ч = 100 ₽
    const result = calculateCost({
      ...baseInput,
      includeDepreciation: true,
      printTimeHours: 10,
      equipmentTotalCost: 50000,
      equipmentLifetimeHours: 5000,
    });
    expect(result.depreciation).toBe(100);
    expect(result.total).toBe(300);
  });

  it('не считает амортизацию при нулевом ресурсе', () => {
    const result = calculateCost({
      ...baseInput,
      includeDepreciation: true,
      printTimeHours: 10,
      equipmentTotalCost: 50000,
      equipmentLifetimeHours: 0,
    });
    expect(result.depreciation).toBe(0);
  });

  it('суммирует дополнительные расходы', () => {
    const result = calculateCost({
      ...baseInput,
      extraCosts: [
        { id: '1', label: 'Упаковка', amount: 50 },
        { id: '2', label: 'Доставка', amount: 300 },
      ],
    });
    expect(result.extras).toBe(350);
    expect(result.total).toBe(550);
  });

  it('добавляет наценку к себестоимости', () => {
    // 200 ₽ + 25% = 250 ₽
    const result = calculateCost({ ...baseInput, markupPercent: 25 });
    expect(result.markupAmount).toBe(50);
    expect(result.priceWithMarkup).toBe(250);
    // себестоимость при этом не меняется
    expect(result.total).toBe(200);
  });

  it('считает полный сценарий со всеми статьями', () => {
    const result = calculateCost({
      filamentPricePerKg: 2500,
      partWeightGrams: 120,
      printTimeHours: 8,
      isMulticolor: true,
      multicolorWastePercent: 20,
      includeElectricity: true,
      electricityTariffPerKwh: 5,
      totalPowerWatts: 300,
      includeDepreciation: true,
      equipmentTotalCost: 80000,
      equipmentLifetimeHours: 4000,
      extraCosts: [{ id: '1', label: 'Упаковка', amount: 100 }],
      markupPercent: 30,
      minSalePrice: 0,
    });
    // материал: 120/1000 × 2500 × 1.2 = 360
    expect(result.material).toBe(360);
    // электроэнергия: 0.3 кВт × 8 ч × 5 = 12
    expect(result.electricity).toBe(12);
    // амортизация: 80000/4000 × 8 = 160
    expect(result.depreciation).toBe(160);
    expect(result.extras).toBe(100);
    // себестоимость: 360 + 12 + 160 + 100 = 632
    expect(result.total).toBe(632);
    // наценка: 632 × 0.3 = 189.6 → цена 821.6
    expect(result.markupAmount).toBe(189.6);
    expect(result.priceWithMarkup).toBe(821.6);
  });

  it('устойчив к отрицательным значениям и null', () => {
    const result = calculateCost({
      ...baseInput,
      filamentPricePerKg: -100,
      partWeightGrams: -50,
      includeElectricity: true,
      printTimeHours: -5,
      totalPowerWatts: -250,
      electricityTariffPerKwh: -6,
      includeDepreciation: true,
      equipmentTotalCost: -1000,
      extraCosts: [{ id: '1', label: 'X', amount: -10 }],
      markupPercent: -20,
    });
    expect(result).toEqual({
      material: 0,
      electricity: 0,
      depreciation: 0,
      extras: 0,
      total: 0,
      markupAmount: 0,
      priceWithMarkup: 0,
      finalPrice: 0,
      minPriceApplied: false,
    });
  });

  it('поднимает цену до минимальной, если расчётная ниже', () => {
    // материал 200 ₽, минимум 500 ₽
    const result = calculateCost({ ...baseInput, minSalePrice: 500 });
    expect(result.priceWithMarkup).toBe(200);
    expect(result.minPriceApplied).toBe(true);
    expect(result.finalPrice).toBe(500);
    // себестоимость не меняется
    expect(result.total).toBe(200);
  });

  it('не трогает цену, если она выше минимальной', () => {
    const result = calculateCost({ ...baseInput, minSalePrice: 100 });
    expect(result.minPriceApplied).toBe(false);
    expect(result.finalPrice).toBe(200);
  });

  it('минимальная цена 0 отключает ограничение', () => {
    const result = calculateCost(baseInput);
    expect(result.minPriceApplied).toBe(false);
    expect(result.finalPrice).toBe(result.priceWithMarkup);
  });
});
