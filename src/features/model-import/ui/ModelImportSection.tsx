import { useRef, useState } from 'react';
import { Button, Group, NumberInput, Stack, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { materials } from '@/entities/material';
import { useCalculatorStore } from '@/features/calculator';
import { importModelFile, type ModelImportResult } from '../lib/importModel';

function showError(message: string) {
  notifications.show({ color: 'red', title: 'Импорт модели', message });
}

export function ModelImportSection() {
  const materialId = useCalculatorStore((s) => s.materialId);
  const infillPercent = useCalculatorStore((s) => s.infillPercent);
  const nozzleDiameter = useCalculatorStore((s) => s.nozzleDiameter);
  const setField = useCalculatorStore((s) => s.setField);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loadedModel, setLoadedModel] = useState<ModelImportResult | null>(
    null,
  );

  const density =
    materials.find((m) => m.id === materialId)?.densityGCm3 ?? 1.24;

  const handleFile = async (file: File | undefined) => {
    // сбрасываем value, чтобы повторный выбор того же файла сработал
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!file) return;

    try {
      const result = await importModelFile(
        file,
        density,
        infillPercent / 100,
        nozzleDiameter,
      );
      setField('partWeightGrams', result.weightGrams);
      // из слайсера время точное — берём; иначе сбрасываем для переоценки
      setField('printTimeHours', result.printTimeHours);
      setLoadedModel(result);
      notifications.show({
        color: 'teal',
        title: result.fromSlicer
          ? 'Модель загружена (данные слайсера)'
          : 'Модель загружена',
        message: result.fromSlicer
          ? `${result.fileName}: точный вес ${result.weightGrams} г` +
            (result.printTimeHours ? `, время ${result.printTimeHours} ч` : '')
          : `${result.fileName}: объём ${Math.round(result.volumeMm3)} мм³, ` +
            `вес ≈ ${result.weightGrams} г (заполнение ${infillPercent}%)`,
      });
    } catch (error) {
      setLoadedModel(null);
      showError(error instanceof Error ? error.message : 'Неизвестная ошибка');
    }
  };

  return (
    <Stack gap="xs">
      <input
        ref={fileInputRef}
        type="file"
        accept=".stl,.3mf"
        hidden
        onChange={(e) => handleFile(e.currentTarget.files?.[0])}
      />
      <Group align="flex-end" wrap="wrap">
        <Button
          variant="light"
          onClick={() => fileInputRef.current?.click()}
        >
          Загрузить файл модели (STL или 3MF)
        </Button>
        <NumberInput
          label="Заполнение (infill), %"
          min={5}
          max={100}
          w={200}
          value={infillPercent}
          onChange={(v) => setField('infillPercent', Number(v) || 35)}
        />
      </Group>
      {loadedModel && (
        <Text size="xs" c="dimmed">
          Загружено: {loadedModel.fileName} ·{' '}
          {loadedModel.triangleCount.toLocaleString('ru-RU')} треугольников ·
          вес {loadedModel.fromSlicer ? '' : '≈ '}
          {loadedModel.weightGrams} г
          {loadedModel.fromSlicer ? ' (точный, из слайсера)' : ''}
        </Text>
      )}
    </Stack>
  );
}
