# Tracker — trip-budget

> Status of every task in the epic. `implement-tasks` updates `done` as it commits each task.
> States: `todo` · `in_progress` · `blocked` · `review` · `done`.

| # | Task | Layer | Owner | Estimate | Blocked by | Status |
|---|---|---|---|---|---|---|
| T0 | [Узгодити контракт trip-budget з живим дротом: прогін contract-forge --update (F1/F2)](./T0-reconcile-contract-with-as-built-wire.md) | docs | Vladimir Makarov | M | — | todo |
| T1 | [Додати знаковий value object Balance у src/shared](./T1-balance-value-object.md) | domain | Vladimir Makarov | S | — | review |
| T2 | [Додати budget, base currency і setBudget() у доменну сутність Trip](./T2-trip-budget-domain.md) | domain | Vladimir Makarov | M | — | review |
| T3 | [Промотувати міграцію budget на trips і змапити колонки в PostgresTripRepository](./T3-budget-migration-trip-repository.md) | migration | Vladimir Makarov | M | T2 | todo |
| T4 | [Додати use case SetTripBudget у BC trips](./T4-set-trip-budget-use-case.md) | app | Vladimir Makarov | S | T2 | todo |
| T5 | [Додати TripBudgetPort, чисту функцію BudgetBlock і адаптер TripRepositoryBudgetPort у BC expenses](./T5-budget-block-and-port.md) | app | Vladimir Makarov | M | T1, T2 | todo |
| T6 | [Повернути блок budget з AddExpense і GetTripSummary](./T6-add-expense-and-summary-budget.md) | app | Vladimir Makarov | M | T5 | todo |
| T7 | [Крок 1/3 currency_code: промотувати expand-міграцію і ввімкнути dual-write у PostgresExpenseRepository](./T7-currency-code-expand.md) | migration | Vladimir Makarov | M | T3 | todo |
| T8 | [Крок 2/3 currency_code: промотувати backfill-міграцію і читати COALESCE(currency_code, currency)](./T8-currency-code-backfill.md) | migration | Vladimir Makarov | S | T7 | todo |
| T9 | [Крок 3/3 currency_code: перевести PostgresExpenseRepository лише на currency_code і промотувати contract-міграцію](./T9-currency-code-contract.md) | migration | Vladimir Makarov | S | T8 | todo |
| T10 | [Додати маршрут PUT /trips/{trip_id}/budget і презентер Trip у tripsRouter](./T10-put-trip-budget-endpoint.md) | ports | Vladimir Makarov | M | T0, T4 | todo |
| T11 | [Перевести POST /trips/{trip_id}/expenses і GET /trips/{trip_id}/summary на форму контракту з блоком budget](./T11-expenses-endpoints-envelope.md) | ports | Vladimir Makarov | L | T6, T10 | todo |
| T12 | [Зшити TripBudgetPort у createApp і додати API-key та request-timing middleware](./T12-app-wiring-api-key.md) | wiring | Vladimir Makarov | M | T5, T10, T11 | todo |
| T13 | [Написати наскрізний HTTP-тест сценарію trip-budget з перевіркою латентності підсумку](./T13-e2e-trip-budget.md) | tests | Vladimir Makarov | M | T12 | todo |

**Total:** 14 tasks, ~6.5 person-days (S = 2h × 4, M = half-day × 9, L = day × 1).
