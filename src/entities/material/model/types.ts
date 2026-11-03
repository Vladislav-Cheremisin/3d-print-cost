/** Тип пластика из справочника */
export interface Material {
  id: string;
  name: string;
  /** Ориентировочная цена за килограмм, ₽ */
  defaultPricePerKgRub: number;
  /** Плотность материала, г/см³ */
  densityGCm3: number;
  /** Типичный предел объёмного расхода (MVS), мм³/с */
  maxFlowMm3s: number;
}
