import { useEffect, useMemo, useState } from 'react';
import {
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
import { buildCalculationInput, useCalculatorStore } from '@/features/calculator';
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

  // Расчёт ведётся в RUB (справочники в рублях), отображаем в выбранной валюте
  const resultRub = useMemo(
    () => calculateCost(buildCalculationInput(state)),
    [state],
  );

  const toSelected = (amount: number) =>
    convertCurrency(amount, 'RUB', state.currency, rates);

  const { currency } = state;

  return (
    <Paper withBorder p="md" radius="md">
      <Stack gap="sm">
        <Title order={3}>Себестоимость</Title>

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

        <Paper bg="teal.0" p="md" radius="md" mt="xs">
          <Group justify="space-between" align="center">
            <Group gap="xs">
              <ThemeIcon color="teal" variant="light" size="lg">
                ₽
              </ThemeIcon>
              <Text fw={600}>Цена для клиента</Text>
            </Group>
            <Text fw={700} size="xl" c="teal.8">
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
