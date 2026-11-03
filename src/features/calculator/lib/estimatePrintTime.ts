import { printers } from '@/entities/equipment';
import { materials } from '@/entities/material';

/** Доля времени печати, когда идёт экструзия (остальное — перемещения, ретракты) */
const EXTRUSION_SHARE = 0.65;
/** Время на прогрев стола и хотэнда, минуты */
const WARMUP_MINUTES = 5;

/** Коэффициент расхода в зависимости от диаметра сопла (база — 0.4 мм) */
const NOZZLE_FLOW_FACTOR: Record<number, number> = {
  0.2: 0.8,
  0.4: 1,
  0.6: 1.15,
  0.8: 1.25,
};

export interface PrintTimeEstimateInput {
  printerId: string;
  materialId: string;
  nozzleDiameter: number;
  partWeightGrams: number;
}

/**
 * Ориентировочная оценка времени печати (в часах) без данных слайсера.
 *
 * Модель: объём детали (вес / плотность) делится на эффективный объёмный
 * расход — минимум из предела хотэнда принтера и предела материала (MVS),
 * скорректированный на диаметр сопла. К чистому времени экструзии
 * добавляется поправка на холостые перемещения и прогрев.
 *
 * Возвращает null, если данных недостаточно (нет веса или неизвестные id).
 */
export function estimatePrintTimeHours(
  input: PrintTimeEstimateInput,
): number | null {
  if (!input.partWeightGrams || input.partWeightGrams <= 0) return null;

  const printer = printers.find((p) => p.id === input.printerId);
  const material = materials.find((m) => m.id === input.materialId);
  if (!printer || !material) return null;

  const volumeMm3 = (input.partWeightGrams / material.densityGCm3) * 1000;
  const nozzleFactor =
    NOZZLE_FLOW_FACTOR[input.nozzleDiameter] ?? 1;
  const flowMm3s =
    Math.min(printer.maxFlowMm3s, material.maxFlowMm3s) * nozzleFactor;
  if (flowMm3s <= 0) return null;

  const extrusionSeconds = volumeMm3 / flowMm3s;
  const totalSeconds =
    extrusionSeconds / EXTRUSION_SHARE + WARMUP_MINUTES * 60;

  return Math.round((totalSeconds / 3600) * 100) / 100;
}
