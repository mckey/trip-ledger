---
id: T6
title: "Повернути блок budget з AddExpense і GetTripSummary"
layer: "app"
deps: ["T5"]
acs: ["AC-03", "AC-03b", "AC-04", "AC-05", "AC-06", "AC-06b", "AC-07"]
files_hint: ["src/expenses/application/AddExpense.ts", "src/expenses/application/AddExpense.test.ts", "src/expenses/application/GetTripSummary.ts", "src/expenses/application/GetTripSummary.test.ts", "src/expenses/presentation/expensesRouter.ts", "src/presentation/app.ts"]
owner: "Vladimir Makarov"
estimate: "M"
status: "todo"
---

# T6 — Повернути блок budget з AddExpense і GetTripSummary

## Why

Overspend signal віддається синхронно у відповіді на додавання витрати ([ADR-0003](../adr/0003-overspend-signal-inline-in-add-expense-response.md), [sad §6 flow 2](../sad.md)), блок залишку — у підсумку ([ADR-0002](../adr/0002-remaining-computed-in-expenses-via-trip-budget-port.md), [sad §6 flow 3](../sad.md)). AC: [PRD §AC-03](../PRD.md), [§AC-03b](../PRD.md), [§AC-04](../PRD.md), [§AC-05](../PRD.md), [§AC-06](../PRD.md), [§AC-06b](../PRD.md), [§AC-07](../PRD.md).

## What

- `src/expenses/application/AddExpense.ts` — отримує `TripBudgetPort`; після `save()` (завжди, незалежно від budget) рахує `BudgetBlock` і повертає `{ expense, budget: BudgetBlock | null }`.
- `src/expenses/application/GetTripSummary.ts` — отримує `TripBudgetPort`; повертає `{ lines, budget: BudgetBlock | null }`, `lines` рахуються як зараз.
- Оновити обидва `*.test.ts` під нову форму результату і додати AC-тести.

## Definition of Done

- [ ] `AddExpense.test.ts`: `it('accepts an expense that exceeds the budget and returns overspend signal')` зелений — витрата збережена, `budget.overspend === true`, remaining від'ємний (AC-04, [sad §10 QG-3](../sad.md)); без budget → `budget: null`; наявні тести на 404/409-помилки зелені.
- [ ] `GetTripSummary.test.ts`: remaining = budget − Σ counted (AC-03); від'ємний показується від'ємним (AC-03b); чужовалютні в `uncounted` (AC-06) і всі чужовалютні → remaining = повний budget (AC-06b); `it('replacing the budget does not touch stored expenses')` — після заміни budget витрати в репозиторії ідентичні, remaining від нового значення (AC-05, AC-07).
- [ ] `npx vitest run src/expenses/application` зелений, `npx tsc --noEmit` чистий (HTTP-тести expenses — у DoD T11).

## Notes

- Конструктори `AddExpense`/`GetTripSummary` отримують `TripBudgetPort`, тому тут же: `expensesRouter(expenses, tripStatus, tripBudget)` — новий параметр, передається в обидва конструктори (маршрути й форма відповіді не змінюються), і call-site у `src/presentation/app.ts` — `new TripRepositoryBudgetPort(deps.trips)`. Інакше `tsc` червоний до T11. Обидва файли далі беруть T11/T12 — lane серіалізований через `deps`.
- Breaking change форми результату для presentation — `expensesRouter` адаптується в T11; до T11 HTTP-тести expenses можуть падати, тому T6 і T11 бажано мерджити поспіль ([sad §11](../sad.md)).
- Два in-process виклики до trips в `AddExpense` (статус + budget) — прийнятий борг ([sad §11](../sad.md)), не зливати порти в цій задачі.
