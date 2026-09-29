---
type: tracker
feature: multi-currency-summary
updated_at: 2026-09-29
---

# Tracker — multi-currency-summary

Плоский стан для виконавця (runner). **Алгоритм вибору:** зверху вниз — перший рядок зі статусом `todo` або `wip` **без assignee** (кинута сесія), у якого **Blocked by** порожній або всі перелічені `done`, і всі **External** `done` у [tracker trip-budget](../../trip-budget/tasks/tracker.md). Рядки впорядковані за хвилями, усередині хвилі — рекомендований порядок для одного виконавця.

| Story | Wave | Status | Assignee | Blocked by | External | Estimate |
|---|---|---|---|---|---|---|
| [DOC-1](./DOC-1-backport-glossary-and-prd.md) | 1 | todo | — | — | — | S |
| [SHR-1](./SHR-1-rate-value-object.md) | 1 | done | — | — | — | M |
| [TRP-1](./TRP-1-trip-base-currency-lock.md) | 1 | done | — | — | trip-budget:T2 | M |
| [MIG-1](./MIG-1-promote-rate-snapshot-migration.md) | 1 | todo | — | — | trip-budget:T3 | S |
| [EXP-1](./EXP-1-expense-rate-attribute-and-ports.md) | 2 | todo | — | SHR-1 | trip-budget:T6, trip-budget:T8 | L |
| [TRP-2](./TRP-2-set-trip-base-currency-use-case.md) | 2 | todo | — | TRP-1 | — | S |
| [EXP-4](./EXP-4-converted-total-in-budget-block.md) | 3 | todo | — | SHR-1, EXP-1 | trip-budget:T6 | L |
| [EXP-5](./EXP-5-expense-repositories-rate-mapping.md) | 3 | todo | — | EXP-1, MIG-1 | — | M |
| [EXP-2](./EXP-2-add-expense-with-optional-rate.md) | 3 | todo | — | EXP-1 | trip-budget:T6 | S |
| [EXP-3](./EXP-3-set-expense-rate-use-case.md) | 3 | todo | — | EXP-1 | — | S |
| [X-1](./X-1-rated-expenses-port-adapter.md) | 4 | todo | — | TRP-1, EXP-5 | — | S |
| [HTTP-1](./HTTP-1-expenses-rate-routes.md) | 4 | todo | — | EXP-2, EXP-3, EXP-5 | trip-budget:T12 | M |
| [HTTP-2](./HTTP-2-trips-base-currency-routes-and-wiring.md) | 5 | todo | — | TRP-2, X-1 | trip-budget:T12 | M |
| [HTTP-3](./HTTP-3-summary-converted-block.md) | 5 | todo | — | EXP-4, HTTP-1 | trip-budget:T12 | S |
| [E2E-1](./E2E-1-multi-currency-journey.md) | 6 | todo | — | HTTP-2, HTTP-3 | — | M |

**Разом:** 15 stories, 6 хвиль, ~54 год ≈ 6.75 людино-днів (S = 2 год, M = 4 год, L = 8 год).

## Status legend

- `todo` — можна брати, щойно блокери `done`.
- `wip` — у роботі. З assignee (я або сесія агента) — не брати; без assignee — сесія впала, story можна підхопити з першого незакритого кроку checklist.
- `done` — змерджено; розблоковує рядки, де вона у Blocked by.
- `blocked` — виконавець упав на кроці; причина — у секції «Notes» story-файлу.

## Next runnable (на 2026-09-29)

> Нарізку Stage 1 закрито `self-answered` ([_generation](./_generation.md#stage-1--slicing-proposal)) — це пропозиція до перегляду owner-ом, не рішення.

- **DOC-1** і **SHR-1** — без жодних блокерів, беруться паралельно (різні файли).
- **TRP-1**, **MIG-1** — чекають trip-budget T2 / T3 (перша хвиля trip-budget ще `todo`).
- Fan-out після W2: EXP-2, EXP-3, EXP-4, EXP-5 не ділять файлів — до чотирьох сесій одночасно.
- File lanes (E8): **EXP-1 → EXP-2 / EXP-4 / EXP-5** (спільні `AddExpense.ts`, `GetTripSummary.ts`, репозиторії), **HTTP-1 → HTTP-3** (`expensesRouter.ts`, `expenses.http.test.ts`).
