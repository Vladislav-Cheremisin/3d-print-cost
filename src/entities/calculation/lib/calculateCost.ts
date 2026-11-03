import { roundTo } from '@/shared/lib/round/round';
import type { CalculationInput, CalculationResult } from '../model/types';

/** Защита от отрицательных и невалидных значений */
function sane(value: number | null | undefined): number {
  if (value === null || value === undefined || Number.isNaN(value)) return 0;
  return Math.max(0, value);
}

/**
 * Рассчитывает себестоимость печати и цену с наценкой.
 *
 * Формулы:
 * - материал = вес × цена за грамм × (1 + отходы многоцвета)
 * - электроэнергия = мощность(кВт) × время(ч) × тариф
 * - амортизация = стоимость оборудования / ресурс(ч) × время(ч)
 * - себестоимость = материал + электроэнергия + амортизация + доп. расходы
 * - цена = себестоимость × (1 + наценка%)
 */
export function calculateCost(input: CalculationInput): CalculationResult {
  const weightGrams = sane(input.partWeightGrams);
  const printTimeHours = sane(input.printTimeHours);

  // Материал
  const wasteMultiplier = input.isMulticolor
    ? 1 + sane(input.multicolorWastePercent) / 100
    : 1;
  const material = roundTo(
    (weightGrams / 1000) * sane(input.filamentPricePerKg) * wasteMultiplier,
  );

  // Электроэнергия (требует время печати)
  const electricity =
    input.includeElectricity && printTimeHours > 0
      ? roundTo(
          (sane(input.totalPowerWatts) / 1000) *
            printTimeHours *
            sane(input.electricityTariffPerKwh),
        )
      : 0;

  // Амортизация (требует время печати и ненулевой ресурс)
  const lifetimeHours = sane(input.equipmentLifetimeHours);
  const depreciation =
    input.includeDepreciation && printTimeHours > 0 && lifetimeHours > 0
      ? roundTo(
          (sane(input.equipmentTotalCost) / lifetimeHours) * printTimeHours,
        )
      : 0;

  // Дополнительные расходы
  const extras = roundTo(
    input.extraCosts.reduce((sum, item) => sum + sane(item.amount), 0),
  );

  const total = roundTo(material + electricity + depreciation + extras);
  const markupAmount = roundTo((total * sane(input.markupPercent)) / 100);
  const priceWithMarkup = roundTo(total + markupAmount);

  // Минимальная стоимость продажи
  const minSalePrice = sane(input.minSalePrice);
  const minPriceApplied = minSalePrice > 0 && priceWithMarkup < minSalePrice;

  return {
    material,
    electricity,
    depreciation,
    extras,
    total,
    markupAmount,
    priceWithMarkup,
    finalPrice: minPriceApplied ? roundTo(minSalePrice) : priceWithMarkup,
    minPriceApplied,
  };
}
