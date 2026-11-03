import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from './App';

describe('App', () => {
  it('рендерит страницу калькулятора без ошибок', () => {
    render(<App />);
    expect(
      screen.getByRole('heading', { name: 'PrintCost', level: 1 }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Материал' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Себестоимость' }),
    ).toBeInTheDocument();
  });

  it('показывает обязательные поля формы', () => {
    render(<App />);
    // Select рендерит и поле, и выбранную опцию — проверяем наличие хотя бы одного
    expect(screen.getAllByLabelText(/Тип пластика/).length).toBeGreaterThan(0);
    expect(screen.getByLabelText(/Вес детали/)).toBeInTheDocument();
    expect(screen.getAllByLabelText(/Принтер/).length).toBeGreaterThan(0);
  });
});
