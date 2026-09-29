# trip-ledger

REST API для обліку особистих поїздок і витрат у них. Поїздка має назву, країну, дати і статус `planned → active → finished`; до неї додаються витрати в будь-якій валюті, а підсумок показує суми по категоріях і валютах. UI немає, тільки JSON.

Проєкт — мій pet-проєкт для курсу Agentic Engineering 2.0: на ньому я проганяю весь SDLC з Claude Code, від ідеї й PRD до виконання задач агентами. Тому поряд із кодом тут лежать артефакти кожного етапу.

## Стек

- TypeScript, Node.js ≥ 22, Express 5, zod
- PostgreSQL 17 через `pg` без ORM ([ADR-0001](docs/adr/0001-initial-setup.md)), міграції — node-pg-migrate
- vitest (+ supertest для HTTP-тестів)

## Архітектура

Clean Architecture, два bounded contexts, залежності тільки всередину:

```
src/
  trips/      # життєвий цикл поїздки
  expenses/   # витрати; про поїздку знає лише tripId і порти
  shared/     # value objects: Money, Balance
  contracts/  # типи й моки, згенеровані з OpenAPI
  presentation/  # createApp + server
```

Кожен BC ділиться на `domain/ → application/ → infrastructure/, presentation/`. `trips` і `expenses` напряму один одного не імпортують: `expenses` бачить поїздку тільки через порти (`TripStatusPort`, `TripBudgetPort`), реалізовані адаптерами в `expenses/infrastructure/`. Повні правила — у [CLAUDE.md](CLAUDE.md) і [ARCHITECTURE.md](ARCHITECTURE.md).

## Запуск

```bash
npm i
docker compose up -d          # Postgres 17 на localhost:54329
export DATABASE_URL=postgres://ledger:ledger@localhost:54329/trip_ledger
make migrate                  # node-pg-migrate up
make dev                      # http://localhost:3000 (PORT перевизначає)
```

Креденшели в `docker-compose.yml` — лише для одноразової локальної бази.

| Команда | Що робить |
|---|---|
| `make test` | юніт- і HTTP-тести (vitest) |
| `make lint` | eslint + `tsc --noEmit` |
| `make build` | компіляція в `dist/` |
| `node scripts/contracts.mjs gen\|lint <feature>` | codegen типів з OpenAPI / spectral-лінт контракту |
| `scripts/db-roundtrip.sh <dir>` | міграції фічі up → down → up на одноразовому Postgres |
| `node scripts/check-workflows.mjs` | синтаксис сценаріїв у `.claude/workflows/` |

## API (як є зараз)

| Метод | Шлях | Що робить |
|---|---|---|
| `POST` | `/trips` | створити поїздку (end < start → 422) |
| `GET` | `/trips` | список поїздок |
| `GET` | `/trips/:id` | одна поїздка |
| `POST` | `/trips/:id/expenses` | додати витрату (у `finished` → 409) |
| `GET` | `/trips/:id/expenses` | витрати поїздки |
| `GET` | `/trips/:id/summary` | підсумок по категоріях і валютах |

Автентифікації поки немає — API-key (`X-API-Key`) заплановано в задачі T12 фічі trip-budget. Контракти майбутніх змін — у `docs/features/*/contracts/openapi.yaml`.

## Фічі в роботі

| Фіча | Що дає | Стан |
|---|---|---|
| [trip-budget](docs/features/trip-budget/) | бюджет поїздки в base currency, залишок і сигнал перевитрати | 14 задач; T0, T1, T2, T4, T5 — `review`, решта `todo` ([tracker](docs/features/trip-budget/tasks/tracker.md)) |
| [multi-currency-summary](docs/features/multi-currency-summary/) | підсумок у base currency за зафіксованими курсами | 15 stories у 6 хвилях, виконання не почато |
| [packing-checklist](docs/features/packing-checklist/) | чекліст речей на поїздку | тільки idea brief |

У кожної фічі однаковий набір документів: `idea-brief.md → PRD.md → sad.md + adr/ → data-model.md + migrations/ → contracts/ → tasks/`. Staged-міграції живуть у теці фічі й переносяться в `migrations/` лише під час реалізації задачі.

## Де що лежить

- [SPEC.md](SPEC.md) — цілі, non-goals і AC першої версії
- [CONTEXT.md](CONTEXT.md) — словник домену (budget ≠ summary, base currency ≠ валюта введення тощо)
- [CHANGELOG.md](CHANGELOG.md) — історія релізів
- `.claude/skills/` — мої форки скілів курсу: `discovery`, `prd-forge`, `arch-forge`, `schema-forge`, `contract-forge`, `task-forge`
- `.claude/rules/` — правила для міграцій і OpenAPI
- `.claude/workflows/audit-entrypoints.mjs` + команда `/audit-entrypoints` — повторюваний аудит точок входу
- `ralph/`, `goal/`, `fanout/` — прогони автономного виконання з модуля 7: Ralph loop (T1), `/goal` (T2), паралельна хвиля T0/T4/T5 і звіт workflow-аудиту

## Відомі борги

- Немає error-middleware: необроблена помилка без `NODE_ENV=production` повертає stack trace у 500 (знайдено workflow-аудитом, [звіт](fanout/audit-entrypoints-run-1.md)).
- `GET /trips/:id/expenses` і `/summary` на неіснуючу поїздку повертають `200 []` замість 404.
- `FinishTrip` реалізований, але не змонтований у роутер.
