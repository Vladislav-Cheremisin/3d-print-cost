import { Container, SimpleGrid, Text, Title } from '@mantine/core';
import { CalculationResult } from '@/widgets/calculation-result';
import { CalculatorForm } from '@/widgets/calculator-form';

export function CalculatorPage() {
  return (
    <Container size="xl" py="xl">
      <Title order={1}>PrintCost</Title>
      <Text c="dimmed" mt="xs" mb="lg">
        Калькулятор себестоимости 3D-печати
      </Text>
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
        <CalculatorForm />
        <CalculationResult />
      </SimpleGrid>
    </Container>
  );
}
