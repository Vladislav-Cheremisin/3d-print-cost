import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Divider,
  Group,
  Paper,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { calculateCost } from '@/entities/calculation';
import {
  CURRENCY_SYMBOLS,
  convertCurrency,
  type CurrencyCode,
  type ExchangeRates,
} from '@/entities/currency';
import {
  buildCalculationInput,
  estimatePrintTimeHours,
  useCalculatorStore,
} from '@/features/calculator';
import { FALLBACK_RATES, fetchExchangeRates } from '@/shared/api/exchangeRates';

function formatMoney(amount: number, currency: CurrencyCode): string {
  const formatted = new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${formatted} ${CURRENCY_SYMBOLS[currency]}`;
}

interface RowProps {
  label: string;
  amount: number;
  currency: CurrencyCode;
  bold?: boolean;
}

function Row({ label, amount, currency, bold }: RowProps) {
  return (
    <Group justify="space-between">
      <Text fw={bold ? 600 : 400} c={bold ? undefined : 'dimmed'}>
        {label}
      </Text>
      <Text fw={bold ? 600 : 400}>
        {formatMoney(amount, currency)}
      </Text>
    </Group>
  );
}

export function CalculationResult() {
  const state = useCalculatorStore();
  const [rates, setRates] = useState<ExchangeRates>(FALLBACK_RATES);

  useEffect(() => {
    let cancelled = false;
    fetchExchangeRates().then((r) => {
      if (!cancelled) setRates(r);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Время из слайсера приоритетно; иначе — ориентировочная оценка
  const estimatedTime = useMemo(
    () =>
      estimatePrintTimeHours({
        printerId: state.printerId,
        materialId: state.materialId,
        nozzleDiameter: state.nozzleDiameter,
        partWeightGrams: state.partWeightGrams ?? 0,
      }),
    [
      state.printerId,
      state.materialId,
      state.nozzleDiameter,
      state.partWeightGrams,
    ],
  );
  const effectiveTime = state.printTimeHours ?? estimatedTime;

  // Расчёт ведётся в RUB (справочники в рублях), отображаем в выбранной валюте
  const resultRub = useMemo(() => {
    const input = buildCalculationInput(state);
    input.printTimeHours = effectiveTime;
    return calculateCost(input);
  }, [state, effectiveTime]);

  const toSelected = (amount: number) =>
    convertCurrency(amount, 'RUB', state.currency, rates);

  const { currency } = state;

  return (
    <Paper withBorder p="md" radius="md">
      <Stack gap="sm">
        <Title order={3}>Себестоимость</Title>

        {(state.includeElectricity || state.includeDepreciation) &&
          !effectiveTime && (
            <Alert color="yellow" variant="light" title="Нет времени печати">
              Укажите время из слайсера или вес детали (для ориентировочной
              оценки) — иначе электроэнергия и амортизация не учитываются.
            </Alert>
          )}

        {effectiveTime !== null && effectiveTime > 0 && (
          <Text size="xs" c="dimmed">
            Время печати:{' '}
            {state.printTimeHours
              ? `${state.printTimeHours} ч (из слайсера)`
              : `≈ ${effectiveTime} ч (оценка по весу, материалу и соплу)`}
          </Text>
        )}

        <Row label="Материал" amount={toSelected(resultRub.material)} currency={currency} />
        {resultRub.electricity > 0 && (
          <Row
            label="Электроэнергия"
            amount={toSelected(resultRub.electricity)}
            currency={currency}
          />
        )}
        {resultRub.depreciation > 0 && (
          <Row
            label="Амортизация"
            amount={toSelected(resultRub.depreciation)}
            currency={currency}
          />
        )}
        {resultRub.extras > 0 && (
          <Row
            label="Доп. расходы"
            amount={toSelected(resultRub.extras)}
            currency={currency}
          />
        )}

        <Divider />

        <Row
          label="Итого себестоимость"
          amount={toSelected(resultRub.total)}
          currency={currency}
          bold
        />

        {state.markupPercent > 0 && (
          <Row
            label={`Наценка ${state.markupPercent}%`}
            amount={toSelected(resultRub.markupAmount)}
            currency={currency}
          />
        )}

        <Paper
          p="md"
          radius="md"
          mt="xs"
          style={{
            background:
              'light-dark(var(--mantine-color-teal-0), var(--mantine-color-dark-6))',
          }}
        >
          <Group justify="space-between" align="center">
            <Group gap="xs">
              <ThemeIcon color="teal" variant="light" size="lg">
                {CURRENCY_SYMBOLS[currency]}
              </ThemeIcon>
              <Text fw={600}>Цена для клиента</Text>
            </Group>
            <Text
              fw={700}
              size="xl"
              style={{
                color:
                  'light-dark(var(--mantine-color-teal-8), var(--mantine-color-teal-3))',
              }}
            >
              {formatMoney(toSelected(resultRub.priceWithMarkup), currency)}
            </Text>
          </Group>
        </Paper>

        {currency !== 'RUB' && (
          <Text size="xs" c="dimmed">
            Расчёт в рублях, конвертация по курсу 1 {currency} ={' '}
            {rates[currency].toFixed(2)} ₽
          </Text>
        )}
      </Stack>
    </Paper>
  );
}
