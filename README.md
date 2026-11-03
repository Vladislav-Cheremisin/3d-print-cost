# PrintCost

Калькулятор себестоимости 3D-печати: материал, электроэнергия, амортизация
оборудования, дополнительные расходы и наценка — с пересчётом в выбранной валюте.

## Стек

- React 19 + TypeScript + Vite
- Zustand (стейт-менеджмент, persist в localStorage)
- Mantine (UI-кит)
- Vitest + Testing Library (юнит-тесты)
- Архитектура: Feature-Sliced Design

## Структура (FSD)

```
src/
  app/        — точка входа приложения, провайдеры, глобальные стили
  pages/      — страницы
  widgets/    — крупные композиционные блоки
  features/   — пользовательские сценарии
  entities/   — доменные сущности и бизнес-логика (движок расчёта)
  shared/     — переиспользуемый код: lib, config, test
```

## Команды

```bash
npm run dev        # dev-сервер
npm test           # юнит-тесты
npm run test:watch # тесты в watch-режиме
npm run build      # продакшн-сборка
npm run lint       # линтер
```
