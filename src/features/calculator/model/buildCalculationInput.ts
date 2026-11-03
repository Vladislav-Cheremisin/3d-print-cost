import type { CalculationInput } from '@/entities/calculation';
import { accessories, printers } from '@/entities/equipment';
import type { CalculatorState } from './calculatorStore';

/** Собирает входные данные для движка расчёта из состояния сторы */
export function buildCalculationInput(
  state: CalculatorState,
): CalculationInput {
  const printer = printers.find((p) => p.id === state.printerId);
  const selectedAccessories = accessories
    .filter((a) => (state.accessoryQuantities[a.id] ?? 0) > 0)
    .map((a) => ({ ...a, quantity: state.accessoryQuantities[a.id] }));

  const totalPowerWatts =
    (printer?.avgPowerWatts ?? 0) +
    selectedAccessories.reduce(
      (sum, a) => sum + a.avgPowerWatts * a.quantity,
      0,
    );

  const equipmentTotalCost =
    (printer?.priceRub ?? 0) +
    selectedAccessories.reduce((sum, a) => sum + a.priceRub * a.quantity, 0);

  return {
    filamentPricePerKg: state.filamentPricePerKg,
    partWeightGrams: state.partWeightGrams ?? 0,
    printTimeHours: state.printTimeHours,
    isMulticolor: state.isMulticolor,
    multicolorWastePercent: state.multicolorWastePercent,
    includeElectricity: state.includeElectricity,
    electricityTariffPerKwh: state.electricityTariffPerKwh,
    totalPowerWatts,
    includeDepreciation: state.includeDepreciation,
    equipmentTotalCost,
    equipmentLifetimeHours: state.equipmentLifetimeHours,
    extraCosts: state.extraCosts,
    markupPercent: state.markupPercent,
  };
}
