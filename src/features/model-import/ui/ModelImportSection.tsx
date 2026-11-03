import { useRef, useState } from 'react';
import {
  Button,
  Group,
  NumberInput,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { materials } from '@/entities/material';
import { useCalculatorStore } from '@/features/calculator';
import { importModelFile, type ModelImportResult } from '../lib/importModel';
import { importFromMakerWorld } from '../lib/importFromUrl';

function showError(message: string) {
  notifications.show({ color: 'red', title: 'Импорт модели', message });
}

export function ModelImportSection() {
  const materialId = useCalculatorStore((s) => s.materialId);
  const infillPercent = useCalculatorStore((s) => s.infillPercent);
  const setField = useCalculatorStore((s) => s.setField);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loadedModel, setLoadedModel] = useState<ModelImportResult | null>(
    null,
  );
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const density =
    materials.find((m) => m.id === materialId)?.densityGCm3 ?? 1.24;

  const handleFile = async (file: File | undefined) => {
    // сбрасываем value, чтобы повторный выбор того же файла сработал
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!file) return;

    try {
      const result = await importModelFile(file, density, infillPercent / 100);
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

  const handleUrl = async () => {
    if (!url.trim()) return;
    setLoading(true);
    try {
      const info = await importFromMakerWorld(url);
      if (info.weightGrams) setField('partWeightGrams', info.weightGrams);
      if (info.printTimeHours) {
        setField('printTimeHours', Math.round(info.printTimeHours * 100) / 100);
      }
      if (!info.weightGrams && !info.printTimeHours) {
        showError(
          'Страница загрузилась, но вес и время не нашлись. ' +
            'Скачайте STL/3MF и загрузите файлом.',
        );
        return;
      }
      notifications.show({
        color: 'teal',
        title: info.title ?? 'Модель с MakerWorld',
        message: `Вес ≈ ${info.weightGrams ?? '—'} г, время ≈ ${
          info.printTimeHours?.toFixed(1) ?? '—'
        } ч (данные со страницы, ориентировочно)`,
      });
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
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

      <TextInput
        label="Ссылка на MakerWorld"
        placeholder="https://makerworld.com/..."
        value={url}
        onChange={(e) => setUrl(e.currentTarget.value)}
        rightSection={
          <Button
            size="compact-sm"
            variant="light"
            loading={loading}
            onClick={handleUrl}
            disabled={!url.trim()}
          >
            Загрузить
          </Button>
        }
        rightSectionWidth={90}
      />
    </Stack>
  );
}
