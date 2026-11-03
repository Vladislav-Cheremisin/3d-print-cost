/** Тип пластика из справочника */
export interface Material {
  id: string;
  name: string;
  /** Ориентировочная цена за килограмм, ₽ */
  defaultPricePerKgRub: number;
}
