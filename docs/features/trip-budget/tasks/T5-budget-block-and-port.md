---
id: T5
title: "Додати TripBudgetPort, чисту функцію BudgetBlock і адаптер TripRepositoryBudgetPort у BC expenses"
layer: "app"
deps: ["T1", "T2"]
acs: ["AC-03", "AC-03b", "AC-05", "AC-06", "AC-06b"]
files_hint: ["src/expenses/domain/Expense.ts", "src/expenses/application/BudgetBlock.ts", "src/expenses/application/BudgetBlock.test.ts", "src/expenses/infrastructure/TripRepositoryBudgetPort.ts", "src/expenses/infrastructure/TripRepositoryBudgetPort.test.ts", "src/expenses/testing/anExpense.ts"]
owner: "Vladimir Makarov"
estimate: "M"
status: "review"
---

# T5 — Додати TripBudgetPort, чисту функцію BudgetBlock і адаптер TripRepositoryBudgetPort у BC expenses

## Why

Remaining і uncounted рахуються в `expenses` чистою функцією, budget читається через порт — [ADR-0002](../adr/0002-remaining-computed-in-expenses-via-trip-budget-port.md), [sad §5](../sad.md), [sad §8](../sad.md) «Cross-BC access». Правила підрахунку — [PRD §AC-03](../PRD.md), [PRD §AC-03b](../PRD.md), [PRD §AC-05](../PRD.md), [PRD §AC-06](../PRD.md), [PRD §AC-06b](../PRD.md); тип remaining — [ADR-0004](../adr/0004-signed-balance-value-object-in-shared.md).

## What

- `src/expenses/domain/Expense.ts` — інтерфейс `TripBudgetPort` (сигнатура — [sad §5](../sad.md)), поруч з `TripStatusPort`.
- `src/expenses/application/BudgetBlock.ts` — чиста функція `(budget, expenses[]) → { budget, remaining: Balance, counted, uncounted, overspend }`; форма — схема `BudgetBlock` у [openapi.yaml](../contracts/openapi.yaml).
- `src/expenses/infrastructure/TripRepositoryBudgetPort.ts` — адаптер поверх `TripRepository.findById()`, дзеркало `TripRepositoryStatusPort.ts`.
- `src/expenses/testing/anExpense.ts` — фабрика фікстур за [data-model.md §Test fixtures](../data-model.md).
- `src/expenses/application/BudgetBlock.test.ts`.

## Definition of Done

- [ ] `npx vitest run src/expenses/application/BudgetBlock.test.ts` зелений: remaining = budget − Σ counted у мінорних одиницях (AC-03); від'ємний remaining лишається від'ємним і `overspend: true` (AC-03b); витрати в іншій валюті лише збільшують `uncounted` (AC-06); усі чужовалютні → remaining = повний budget, `uncounted` = кількість усіх (AC-06b); вхідні `Expense` не мутуються (AC-05).
- [ ] `TripRepositoryBudgetPort.test.ts`: для поїздки без budget порт повертає `null`, з budget — `Money` у base currency.
- [ ] `src/expenses/domain/` і `application/` не імпортують `trips/`; з `trips/` імпортує лише `TripRepositoryBudgetPort.ts` в `infrastructure/` (єдиний дозволений шов, як `TripRepositoryStatusPort.ts`).
- [ ] `npx tsc --noEmit` чистий.

## Notes

- Окремий порт, а не розширення `TripStatusPort` — так вирішено в ADR-0002 (варіант 3 відкинуто).
- `ExpenseRepository` не має `findById` — фічі він не потрібен: `BudgetBlock` рахує поверх `findByTrip`.
