import { beforeEach, describe, expect, it } from 'vitest';
import { buildCalculationInput } from './buildCalculationInput';
import { useCalculatorStore } from './calculatorStore';

const initialState = useCalculatorStore.getState();

describe('calculatorStore', () => {
  beforeEach(() => {
    useCalculatorStore.setState(initialState, true);
  });

  it('setField обновляет произвольное поле', () => {
    useCalculatorStore.getState().setField('filamentPricePerKg', 2500);
    expect(useCalculatorStore.getState().filamentPricePerKg).toBe(2500);
  });

  it('toggleAccessory добавляет и убирает оборудование', () => {
    const { toggleAccessory } = useCalculatorStore.getState();
    toggleAccessory('filament-dryer-generic');
    expect(useCalculatorStore.getState().accessoryIds).toContain(
      'filament-dryer-generic',
    );
    toggleAccessory('filament-dryer-generic');
    expect(useCalculatorStore.getState().accessoryIds).not.toContain(
      'filament-dryer-generic',
    );
  });

  it('управляет доп. расходами: добавить / изменить / удалить', () => {
    const store = useCalculatorStore.getState();
    store.addExtraCost();
    const [added] = useCalculatorStore.getState().extraCosts;
    expect(added).toBeDefined();

    store.updateExtraCost(added.id, { label: 'Упаковка', amount: 50 });
    expect(useCalculatorStore.getState().extraCosts[0]).toMatchObject({
      label: 'Упаковка',
      amount: 50,
    });

    store.removeExtraCost(added.id);
    expect(useCalculatorStore.getState().extraCosts).toHaveLength(0);
  });
});

describe('buildCalculationInput', () => {
  beforeEach(() => {
    useCalculatorStore.setState(initialState, true);
  });

  it('подставляет мощность и цену принтера из справочника', () => {
    useCalculatorStore.getState().setField('printerId', 'bambu-p1s');
    const input = buildCalculationInput(useCalculatorStore.getState());
    expect(input.totalPowerWatts).toBe(100);
    expect(input.equipmentTotalCost).toBe(72000);
  });

  it('суммирует мощность и стоимость доп. оборудования', () => {
    useCalculatorStore.getState().setField('printerId', 'bambu-p1s');
    useCalculatorStore.getState().toggleAccessory('filament-dryer-generic');
    const input = buildCalculationInput(useCalculatorStore.getState());
    expect(input.totalPowerWatts).toBe(100 + 150);
    expect(input.equipmentTotalCost).toBe(72000 + 4000);
  });

  it('null веса и времени превращает в безопасные значения', () => {
    const input = buildCalculationInput(useCalculatorStore.getState());
    expect(input.partWeightGrams).toBe(0);
    expect(input.printTimeHours).toBeNull();
  });
});
