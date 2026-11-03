import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ExtraCost } from '@/entities/calculation';
import type { CurrencyCode } from '@/entities/currency';

export const NOZZLE_DIAMETERS = [0.2, 0.4, 0.6, 0.8] as const;

/** Выбранное доп. оборудование: id позиции → количество */
export type AccessoryQuantities = Record<string, number>;

export interface CalculatorState {
  // --- Материал ---
  materialId: string;
  filamentPricePerKg: number;
  partWeightGrams: number | null;

  // --- Печать ---
  printerId: string;
  nozzleDiameter: number;
  printTimeHours: number | null;
  isMulticolor: boolean;
  multicolorWastePercent: number;

  // --- Электроэнергия ---
  includeElectricity: boolean;
  electricityTariffPerKwh: number | null;

  // --- Амортизация ---
  includeDepreciation: boolean;
  equipmentLifetimeHours: number;
  accessoryQuantities: AccessoryQuantities;

  // --- Прочее ---
  extraCosts: ExtraCost[];
  markupPercent: number;
  currency: CurrencyCode;

  // --- Действия ---
  setField: <K extends keyof CalculatorState>(
    field: K,
    value: CalculatorState[K],
  ) => void;
  /** Устанавливает выбранные позиции оборудования (новые — с количеством 1) */
  setAccessories: (ids: string[]) => void;
  setAccessoryQuantity: (id: string, quantity: number) => void;
  addExtraCost: () => void;
  updateExtraCost: (id: string, patch: Partial<Omit<ExtraCost, 'id'>>) => void;
  removeExtraCost: (id: string) => void;
}

let extraCostCounter = 0;
const nextExtraCostId = () => `extra-${Date.now()}-${extraCostCounter++}`;

export const useCalculatorStore = create<CalculatorState>()(
  persist(
    (set) => ({
      materialId: 'pla',
      filamentPricePerKg: 1800,
      partWeightGrams: null,

      printerId: 'bambu-a1',
      nozzleDiameter: 0.4,
      printTimeHours: null,
      isMulticolor: false,
      multicolorWastePercent: 40,

      includeElectricity: true,
      electricityTariffPerKwh: 6,

      includeDepreciation: true,
      equipmentLifetimeHours: 5000,
      accessoryQuantities: {},

      extraCosts: [],
      markupPercent: 0,
      currency: 'RUB',

      setField: (field, value) => set({ [field]: value }),
      setAccessories: (ids) =>
        set((state) => ({
          accessoryQuantities: Object.fromEntries(
            ids.map((id) => [id, state.accessoryQuantities[id] ?? 1]),
          ),
        })),
      setAccessoryQuantity: (id, quantity) =>
        set((state) => {
          if (!(id in state.accessoryQuantities)) return state;
          const qty = Math.max(1, Math.floor(quantity) || 1);
          return {
            accessoryQuantities: { ...state.accessoryQuantities, [id]: qty },
          };
        }),
      addExtraCost: () =>
        set((state) => ({
          extraCosts: [
            ...state.extraCosts,
            { id: nextExtraCostId(), label: '', amount: 0 },
          ],
        })),
      updateExtraCost: (id, patch) =>
        set((state) => ({
          extraCosts: state.extraCosts.map((item) =>
            item.id === id ? { ...item, ...patch } : item,
          ),
        })),
      removeExtraCost: (id) =>
        set((state) => ({
          extraCosts: state.extraCosts.filter((item) => item.id !== id),
        })),
    }),
    {
      name: 'printcost.calculator',
      version: 2,
      // Сохраняем только часто повторяющиеся настройки оборудования
      partialize: (state) => ({
        printerId: state.printerId,
        nozzleDiameter: state.nozzleDiameter,
        electricityTariffPerKwh: state.electricityTariffPerKwh,
        includeElectricity: state.includeElectricity,
        includeDepreciation: state.includeDepreciation,
        equipmentLifetimeHours: state.equipmentLifetimeHours,
        accessoryQuantities: state.accessoryQuantities,
        currency: state.currency,
        materialId: state.materialId,
        filamentPricePerKg: state.filamentPricePerKg,
      }),
      migrate: (persisted) => {
        // v1: accessoryIds: string[] → v2: accessoryQuantities: Record<string, number>
        const state = persisted as Record<string, unknown>;
        if (Array.isArray(state.accessoryIds)) {
          state.accessoryQuantities = Object.fromEntries(
            (state.accessoryIds as string[]).map((id) => [id, 1]),
          );
          delete state.accessoryIds;
        }
        return state;
      },
    },
  ),
);
