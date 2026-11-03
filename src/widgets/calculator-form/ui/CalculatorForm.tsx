import {
  Accordion,
  ActionIcon,
  Button,
  Checkbox,
  Divider,
  Group,
  MultiSelect,
  NumberInput,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { accessories, printers } from '@/entities/equipment';
import { CURRENCIES, type CurrencyCode } from '@/entities/currency';
import { materials } from '@/entities/material';
import {
  NOZZLE_DIAMETERS,
  useCalculatorStore,
} from '@/features/calculator';

export function CalculatorForm() {
  const state = useCalculatorStore();
  const { setField } = state;

  const handleMaterialChange = (materialId: string | null) => {
    if (!materialId) return;
    setField('materialId', materialId);
    const material = materials.find((m) => m.id === materialId);
    if (material) setField('filamentPricePerKg', material.defaultPricePerKgRub);
  };

  return (
    <Paper withBorder p="md" radius="md">
      <Stack gap="lg">
        <div>
          <Title order={3} mb="sm">
            Материал
          </Title>
          <SimpleGrid cols={{ base: 1, sm: 3 }}>
            <Select
              label="Тип пластика"
              required
              data={materials.map((m) => ({ value: m.id, label: m.name }))}
              value={state.materialId}
              onChange={handleMaterialChange}
            />
            <NumberInput
              label="Цена филамента, за кг"
              required
              min={0}
              value={state.filamentPricePerKg}
              onChange={(v) => setField('filamentPricePerKg', Number(v) || 0)}
            />
            <NumberInput
              label="Вес детали, г"
              required
              min={0}
              placeholder="Например, 120"
              value={state.partWeightGrams ?? ''}
              onChange={(v) =>
                setField('partWeightGrams', v === '' ? null : Number(v))
              }
            />
          </SimpleGrid>
        </div>

        <Divider />

        <div>
          <Title order={3} mb="sm">
            Печать
          </Title>
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <Select
              label="Принтер"
              required
              searchable
              data={printers.map((p) => ({
                value: p.id,
                label: `${p.name} · ~${p.avgPowerWatts} Вт`,
              }))}
              value={state.printerId}
              onChange={(v) => v && setField('printerId', v)}
            />
            <Select
              label="Диаметр сопла, мм"
              data={NOZZLE_DIAMETERS.map((d) => ({
                value: String(d),
                label: String(d),
              }))}
              value={String(state.nozzleDiameter)}
              onChange={(v) => v && setField('nozzleDiameter', Number(v))}
            />
            <NumberInput
              label="Время печати из слайсера, ч"
              min={0}
              decimalScale={2}
              placeholder="Например, 8.5"
              value={state.printTimeHours ?? ''}
              onChange={(v) =>
                setField('printTimeHours', v === '' ? null : Number(v))
              }
            />
            <div>
              <Switch
                label="Многоцветная печать"
                checked={state.isMulticolor}
                onChange={(e) =>
                  setField('isMulticolor', e.currentTarget.checked)
                }
                mt="md"
              />
              {state.isMulticolor && (
                <NumberInput
                  label="Отходы на смену филамента, %"
                  min={0}
                  max={300}
                  value={state.multicolorWastePercent}
                  onChange={(v) =>
                    setField('multicolorWastePercent', Number(v) || 0)
                  }
                  mt="xs"
                />
              )}
            </div>
          </SimpleGrid>
        </div>

        <Divider />

        <Accordion variant="separated" defaultValue="energy">
          <Accordion.Item value="energy">
            <Accordion.Control>
              <Text fw={600}>Дополнительные параметры (точнее расчёт)</Text>
            </Accordion.Control>
            <Accordion.Panel>
              <Stack gap="md">
                <Group align="flex-end" wrap="wrap">
                  <Checkbox
                    label="Учитывать электроэнергию"
                    checked={state.includeElectricity}
                    onChange={(e) =>
                      setField('includeElectricity', e.currentTarget.checked)
                    }
                  />
                  {state.includeElectricity && (
                    <NumberInput
                      label="Тариф, за кВт·ч"
                      min={0}
                      decimalScale={2}
                      w={180}
                      value={state.electricityTariffPerKwh ?? ''}
                      onChange={(v) =>
                        setField(
                          'electricityTariffPerKwh',
                          v === '' ? null : Number(v),
                        )
                      }
                    />
                  )}
                </Group>

                <Group align="flex-end" wrap="wrap">
                  <Checkbox
                    label="Учитывать амортизацию оборудования"
                    checked={state.includeDepreciation}
                    onChange={(e) =>
                      setField('includeDepreciation', e.currentTarget.checked)
                    }
                  />
                  {state.includeDepreciation && (
                    <NumberInput
                      label="Ресурс оборудования, ч"
                      min={1}
                      step={500}
                      w={200}
                      value={state.equipmentLifetimeHours}
                      onChange={(v) =>
                        setField('equipmentLifetimeHours', Number(v) || 5000)
                      }
                    />
                  )}
                </Group>

                <MultiSelect
                  label="Доп. оборудование (фены, сушилки и т.п.)"
                  description="Их мощность и стоимость добавятся к расчёту"
                  data={accessories.map((a) => ({
                    value: a.id,
                    label: `${a.name} · ~${a.avgPowerWatts} Вт`,
                  }))}
                  value={state.accessoryIds}
                  onChange={(ids) =>
                    setField(
                      'accessoryIds',
                      accessories
                        .map((a) => a.id)
                        .filter((id) => ids.includes(id)),
                    )
                  }
                />
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>

        <Divider />

        <div>
          <Group justify="space-between" mb="sm">
            <Title order={3}>Дополнительные расходы</Title>
            <Button variant="light" size="xs" onClick={state.addExtraCost}>
              + Добавить
            </Button>
          </Group>
          {state.extraCosts.length === 0 ? (
            <Text c="dimmed" size="sm">
              Упаковка, доставка, постобработка — добавьте при необходимости
            </Text>
          ) : (
            <Stack gap="xs">
              {state.extraCosts.map((item) => (
                <Group key={item.id} wrap="nowrap">
                  <TextInput
                    placeholder="Название (упаковка…)"
                    style={{ flex: 1 }}
                    value={item.label}
                    onChange={(e) =>
                      state.updateExtraCost(item.id, {
                        label: e.currentTarget.value,
                      })
                    }
                  />
                  <NumberInput
                    placeholder="Сумма"
                    min={0}
                    w={140}
                    value={item.amount || ''}
                    onChange={(v) =>
                      state.updateExtraCost(item.id, {
                        amount: Number(v) || 0,
                      })
                    }
                  />
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    aria-label="Удалить расход"
                    onClick={() => state.removeExtraCost(item.id)}
                  >
                    ✕
                  </ActionIcon>
                </Group>
              ))}
            </Stack>
          )}
        </div>

        <Divider />

        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <NumberInput
            label="Наценка, %"
            min={0}
            max={1000}
            value={state.markupPercent}
            onChange={(v) => setField('markupPercent', Number(v) || 0)}
          />
          <Select
            label="Валюта"
            data={CURRENCIES as unknown as string[]}
            value={state.currency}
            onChange={(v) => v && setField('currency', v as CurrencyCode)}
          />
        </SimpleGrid>
      </Stack>
    </Paper>
  );
}
