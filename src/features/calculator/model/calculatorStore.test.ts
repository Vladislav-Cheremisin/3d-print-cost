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

  it('setAccessories добавляет позиции с количеством 1', () => {
    useCalculatorStore
      .getState()
      .setAccessories(['filament-dryer-generic', 'heat-gun']);
    expect(useCalculatorStore.getState().accessoryQuantities).toEqual({
      'filament-dryer-generic': 1,
      'heat-gun': 1,
    });
  });

  it('setAccessories сохраняет количество уже выбранных позиций', () => {
    const store = useCalculatorStore.getState();
    store.setAccessories(['filament-dryer-generic']);
    store.setAccessoryQuantity('filament-dryer-generic', 3);
    store.setAccessories(['filament-dryer-generic', 'heat-gun']);
    expect(useCalculatorStore.getState().accessoryQuantities).toEqual({
      'filament-dryer-generic': 3,
      'heat-gun': 1,
    });
  });

  it('setAccessoryQuantity меняет количество, минимум 1', () => {
    const store = useCalculatorStore.getState();
    store.setAccessories(['filament-dryer-generic']);
    store.setAccessoryQuantity('filament-dryer-generic', 2);
    expect(
      useCalculatorStore.getState().accessoryQuantities[
        'filament-dryer-generic'
      ],
    ).toBe(2);
    store.setAccessoryQuantity('filament-dryer-generic', 0);
    expect(
      useCalculatorStore.getState().accessoryQuantities[
        'filament-dryer-generic'
      ],
    ).toBe(1);
  });

  it('setAccessoryQuantity игнорирует невыбранные позиции', () => {
    useCalculatorStore.getState().setAccessoryQuantity('heat-gun', 5);
    expect(useCalculatorStore.getState().accessoryQuantities).toEqual({});
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

  it('суммирует мощность и стоимость оборудования с учётом количества', () => {
    const store = useCalculatorStore.getState();
    store.setField('printerId', 'bambu-p1s');
    store.setAccessories(['filament-dryer-generic']);
    store.setAccessoryQuantity('filament-dryer-generic', 2);
    const input = buildCalculationInput(useCalculatorStore.getState());
    // 100 Вт принтер + 2 × 150 Вт сушилки
    expect(input.totalPowerWatts).toBe(100 + 2 * 150);
    // 72000 ₽ принтер + 2 × 4000 ₽
    expect(input.equipmentTotalCost).toBe(72000 + 2 * 4000);
  });

  it('null веса и времени превращает в безопасные значения', () => {
    const input = buildCalculationInput(useCalculatorStore.getState());
    expect(input.partWeightGrams).toBe(0);
    expect(input.printTimeHours).toBeNull();
  });
});
