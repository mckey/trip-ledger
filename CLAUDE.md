# trip-ledger

REST API для обліку особистих поїздок і витрат у них. TypeScript + Node.js (Express), Clean Architecture, два bounded contexts: `trips` і `expenses`.

## Команди

- `make dev` — запуск дев-сервера (ts-node-dev)
- `make test` — юніт-тести (vitest)
- `make lint` — eslint + tsc --noEmit
- `make build` — компіляція в dist/

## Структура

```
src/
  trips/        # BC: поїздки (створення, статуси, дати)
  expenses/     # BC: витрати, прив'язані до поїздки
  shared/       # спільні value objects (Money, DateRange), без бізнес-логіки
```

Кожен BC має чотири шари: `domain/`, `application/`, `infrastructure/`, `presentation/`.

## Dependency rule (КРИТИЧНО — TypeScript не enforce-ить це компілятором)

Залежності вказують тільки всередину:

```
presentation -> application -> domain
infrastructure -> domain (реалізує інтерфейси domain)
```

Заборонено:
- `domain/` НЕ імпортує НІЧОГО з `application/`, `infrastructure/`, `presentation/` і жодних фреймворків (express, pg, zod). Тільки чистий TypeScript.
- `application/` НЕ імпортує з `infrastructure/` і `presentation/`. Репозиторії отримує через інтерфейси, оголошені в `domain/`.
- BC `trips` і `expenses` НЕ імпортують один одного напряму — тільки через `shared/` або по id.

Інтерфейси репозиторіїв (`TripRepository`, `ExpenseRepository`) живуть у `domain/`, реалізації (Postgres) — в `infrastructure/`. Новий код клади за цим правилом; якщо не впевнений куди — спитай, не вгадуй.

## Конвенції

- Domain-сутності — класи без декораторів, валідація інваріантів у конструкторі.
- Use cases — один клас = одна дія (`CreateTrip`, `AddExpense`), метод `execute()`.
- HTTP-схеми (zod) тільки в `presentation/`, у domain вони не протікають.
