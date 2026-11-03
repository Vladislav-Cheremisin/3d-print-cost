import { Container, Text, Title } from '@mantine/core';

export function CalculatorPage() {
  return (
    <Container size="lg" py="xl">
      <Title order={1}>PrintCost</Title>
      <Text c="dimmed" mt="sm">
        Калькулятор себестоимости 3D-печати
      </Text>
    </Container>
  );
}
