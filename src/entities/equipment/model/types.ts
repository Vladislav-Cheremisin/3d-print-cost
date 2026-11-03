/** 3D-принтер из справочника. Цены ориентировочные, редактируются пользователем. */
export interface Printer {
  id: string;
  name: string;
  brand: string;
  /** Средняя потребляемая мощность при печати, Вт */
  avgPowerWatts: number;
  /** Ориентировочная цена, ₽ */
  priceRub: number;
  /** Ориентировочный ресурс механики до капитального обслуживания, часов */
  lifetimeHours: number;
  /** Поддержка многоцветной печати из коробки (AMS/AMS lite) */
  multicolorCapable: boolean;
}

/** Дополнительное оборудование: фены, сушилки, камеры и т.п. */
export interface Accessory {
  id: string;
  name: string;
  /** Потребляемая мощность, Вт */
  avgPowerWatts: number;
  /** Ориентировочная цена, ₽ */
  priceRub: number;
}
