import {
  ActionIcon,
  Container,
  Group,
  SimpleGrid,
  Text,
  Title,
  useMantineColorScheme,
} from '@mantine/core';
import { CalculationResult } from '@/widgets/calculation-result';
import { CalculatorForm } from '@/widgets/calculator-form';

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  );
}

export function CalculatorPage() {
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Container size="xl" py="xl">
      <Group justify="space-between" align="flex-start" mb="lg">
        <div>
          <Title order={1}>PrintCost</Title>
          <Text c="dimmed" mt="xs">
            Калькулятор себестоимости 3D-печати
          </Text>
        </div>
        <ActionIcon
          variant="default"
          size="lg"
          radius="md"
          aria-label={isDark ? 'Включить светлую тему' : 'Включить тёмную тему'}
          onClick={() => setColorScheme(isDark ? 'light' : 'dark')}
        >
          {isDark ? <SunIcon /> : <MoonIcon />}
        </ActionIcon>
      </Group>
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
        <CalculatorForm />
        <CalculationResult />
      </SimpleGrid>
    </Container>
  );
}
