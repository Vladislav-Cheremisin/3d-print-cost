/** Дополнительная статья расходов (упаковка, доставка и т.п.) */
export interface ExtraCost {
  id: string;
  label: string;
  amount: number;
}

/** Входные данные расчёта себестоимости. Денежные суммы — в валюте расчёта. */
export interface CalculationInput {
  // --- Обязательные ---
  /** Цена филамента за килограмм */
  filamentPricePerKg: number;
  /** Вес готовой детали, граммы */
  partWeightGrams: number;

  // --- Опциональные параметры печати ---
  /** Время печати из слайсера, часы. null — неизвестно */
  printTimeHours: number | null;
  /** Многоцветная печать (учитывает доп. отходы на смену филамента) */
  isMulticolor: boolean;
  /** Доп. отходы материала при многоцветной печати, % */
  multicolorWastePercent: number;

  // --- Электроэнергия ---
  includeElectricity: boolean;
  /** Тариф за кВт·ч */
  electricityTariffPerKwh: number | null;
  /** Суммарная потребляемая мощность (принтер + фены и пр.), Вт */
  totalPowerWatts: number | null;

  // --- Амортизация ---
  includeDepreciation: boolean;
  /** Полная стоимость оборудования (принтер + доп.), в валюте расчёта */
  equipmentTotalCost: number | null;
  /** Ресурс оборудования, часов (по умолчанию 5000) */
  equipmentLifetimeHours: number;

  // --- Прочее ---
  /** Дополнительные расходы */
  extraCosts: ExtraCost[];
  /** Наценка, % */
  markupPercent: number;
}

/** Разбивка результата расчёта по статьям */
export interface CalculationResult {
  /** Стоимость материала (с учётом отходов многоцветной печати) */
  material: number;
  /** Затраты на электроэнергию (0, если не учитываются) */
  electricity: number;
  /** Амортизация оборудования (0, если не учитывается) */
  depreciation: number;
  /** Сумма дополнительных расходов */
  extras: number;
  /** Полная себестоимость */
  total: number;
  /** Сумма наценки */
  markupAmount: number;
  /** Цена для клиента (себестоимость + наценка) */
  priceWithMarkup: number;
}
