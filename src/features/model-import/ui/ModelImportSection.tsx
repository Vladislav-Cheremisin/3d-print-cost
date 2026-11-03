import { useState } from 'react';
import {
  Button,
  FileInput,
  Group,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { materials } from '@/entities/material';
import { useCalculatorStore } from '@/features/calculator';
import { importModelFile } from '../lib/importModel';
import { importFromMakerWorld } from '../lib/importFromUrl';

function showError(message: string) {
  notifications.show({ color: 'red', title: 'Импорт модели', message });
}

export function ModelImportSection() {
  const materialId = useCalculatorStore((s) => s.materialId);
  const setField = useCalculatorStore((s) => s.setField);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const density =
    materials.find((m) => m.id === materialId)?.densityGCm3 ?? 1.24;

  const handleFile = async (file: File | null) => {
    if (!file) return;
    try {
      const result = await importModelFile(file, density);
      setField('partWeightGrams', result.weightGrams);
      setField('printTimeHours', null); // время переоценится по весу
      notifications.show({
        color: 'teal',
        title: 'Модель загружена',
        message: `${result.fileName}: ${result.triangleCount} треугольников, ` +
          `объём ${Math.round(result.volumeMm3)} мм³, вес ≈ ${result.weightGrams} г`,
      });
    } catch (error) {
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
      <Group grow align="flex-start" wrap="wrap">
        <FileInput
          label="Файл модели"
          placeholder="STL или 3MF"
          accept=".stl,.3mf"
          onChange={handleFile}
        />
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
      </Group>
      <Text size="xs" c="dimmed">
        Вес из файла — оценка по объёму модели с учётом заполнения ~35%.
        Плотность берётся из выбранного типа пластика.
      </Text>
    </Stack>
  );
}
