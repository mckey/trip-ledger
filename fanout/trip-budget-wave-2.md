# Fan-out: trip-budget, хвиля 2 (урок 7.4)

База: `lesson-7.3-goal` (`769c676`), T1/T2 у `review`. Розблоковані залежностями: T0, T3, T4, T5.

## Files touched

| Задача | Файли (пише) | Читає |
|---|---|---|
| T0 contract reconcile | `docs/features/trip-budget/contracts/openapi.yaml`, `docs/features/trip-budget/contracts/api-sync-report.md`, `src/contracts/trip-budget.gen.ts`, `src/contracts/trip-budget.fixtures.ts` | `src/*/presentation/*Router.ts`, контракт multi-currency-summary |
| T4 SetTripBudget | `src/trips/application/SetTripBudget.ts`, `src/trips/application/SetTripBudget.test.ts` | `src/trips/domain/*`, `src/trips/testing/aTrip.ts` |
| T5 BudgetBlock + port | `src/expenses/domain/Expense.ts`, `src/expenses/application/BudgetBlock.ts`, `src/expenses/application/BudgetBlock.test.ts`, `src/expenses/infrastructure/TripRepositoryBudgetPort.ts`, `src/expenses/infrastructure/TripRepositoryBudgetPort.test.ts`, `src/expenses/testing/anExpense.ts` | `src/shared/Balance.ts`, `src/trips/domain/Trip.ts` |

Перетинів по записуваних файлах: **0 → паралелимо**.

## Що відсіяно до запуску

- **T3** — незалежна по файлах, але її DoD (`scripts/db-roundtrip.sh`) вимагає Docker, а демон не запущений. Виконавець не зможе повернути зелену перевірку → не в цю хвилю.
- **`docs/features/trip-budget/tasks/tracker.md` і `T*.md`** — прихований спільний файл: кожен виконавець захотів би перевести свій рядок у `review`. Правило: статуси й коміти робить лише координатор, виконавці трекер не чіпають.
- **`tsc --noEmit`** — глобальна перевірка на спільному робочому дереві: поки сусід пише, можуть з'являтися чужі помилки. Виконавець звітує лише помилки у своїх файлах; фінальний `tsc` і `vitest` — координатор після збирання.
- **git** — один `index.lock` на дерево, тому виконавці не комітять.

## Прогін

Три виклики `Agent` (model: sonnet) в одному ході координатора: один `message.id`, три `tool_use` — див. [turn-log.txt](./turn-log.txt).

| Задача | Tool calls | Токени виконавця | Час | Перевірка виконавця |
|---|---|---|---|---|
| T4 | 14 | ~77k | 98 с | vitest 5/5, tsc чистий по своїх файлах |
| T5 | 30 | ~95k | 193 с | vitest src/expenses 20/20, tsc 0 |
| T0 | 33 | ~189k | 536 с | contracts lint 0 problems, tsc 0 |

Разом ~361k токенів виконавців; wall-clock хвилі = найдовша задача (~9 хв), послідовно було б ~14 хв.

## Збирання координатором

- `git status`: змінені файли ⊆ таблиці files touched, чужих змін нема.
- `tsc --noEmit` 0, `vitest run` 68/68 (було 53: +5 T4, +10 T5), `contracts.mjs lint trip-budget` 0 problems.
- Трекер: T0/T4/T5 → `review` (лише координатор).

## Що виконавці винесли як відкрите

- T4: нуль/від'ємний budget домен відкидає нетипізованим `Error`, а не sentinel-помилкою — у контракті T0 для цього лише `http.validation_failed`; окреме рішення, не T4.
- T5: `AddExpense`/`GetTripSummary` ще не викликають `BudgetBlock` — це T6.
- T0: F3–F7 успадковані без змін; mock server не запускався.
