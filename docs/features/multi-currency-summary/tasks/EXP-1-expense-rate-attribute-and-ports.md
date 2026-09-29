---
id: EXP-1
title: "Expense.rate / withRate, findById в обох репозиторіях, нові помилки, TripBudgetPort з baseCurrency"
epic: multi-currency-summary
project: trip-ledger
bc: expenses
layer: domain
wave: 2
priority: Must
estimate: L
blocks: [EXP-2, EXP-3, EXP-4, EXP-5]
blocked_by: [SHR-1]
external_blocked_by: ["trip-budget:T6", "trip-budget:T8"]
status: todo
owner: "Vladimir Makarov"
context_budget: ~2800 tokens
prd_refs: [AC-01, AC-05]
sad_refs: ["Critical flow 1", "Critical flow 3"]
data_refs: [data-model.md#domain--columns, data-model.md#test-fixtures]
openapi_ops: [addExpense, setExpenseRate]
adr_refs: ["0001", "0004"]
files: [src/expenses/domain/Expense.ts, src/expenses/domain/errors.ts, src/expenses/domain/Expense.test.ts, src/expenses/testing/anExpense.ts, src/expenses/infrastructure/InMemoryExpenseRepository.ts, src/expenses/infrastructure/PostgresExpenseRepository.ts, src/expenses/infrastructure/TripRepositoryBudgetPort.ts, src/expenses/application/AddExpense.ts, src/expenses/application/GetTripSummary.ts]
created: 2026-09-29
---

# EXP-1 · Domain BC expenses: курс на витраті і порти

**Epic:** [multi-currency-summary](./_epic.md) · **Wave:** 2 · **Estimate:** L · **Owner:** Vladimir Makarov

## Місце в послідовності

- **Блокується:** SHR-1 (`Rate`); зовнішньо — trip-budget T6 (після неї `TripBudgetPort`, його адаптер з T5 і виклики в `AddExpense`/`GetTripSummary` уже існують — тут вони лише змінюють форму) і T8 (крок 2/3 `currency_code` у тому ж `PostgresExpenseRepository.ts`).
- **Блокує:** EXP-2, EXP-3, EXP-4 (use cases читають нові поля), EXP-5 (мапінг курсу і `hasRatedExpenses` у тих самих репозиторіях).
- **Чому в цій хвилі:** перший шар, що залежить від `Rate`. L, бо зміна інтерфейсів тягне всі їхні реалізації в той самий PR — інакше `tsc` червоний між stories.

## Why

Курс — атрибут витрати, а не окрема сутність (ADR-0001): `Expense` отримує необов'язкові `rate` і `rateSetAt`, заміна курсу повертає нову витрату з тією ж сумою й валютою (AC-05). Тут же — доменні контракти, які чекають use cases: пошук витрати за id і base currency поїздки без budget.

## Linked artifacts (read-only — НЕ вставляти вміст)

- 🧭 Domain: [CONTEXT · Glossary](../CONTEXT.md#glossary) — rate snapshot, effective rate; [Sentinel errors](../CONTEXT.md#sentinel-errors) — `ExpenseNotFoundError`, `BaseCurrencyNotSetError`
- 🌐 Sequence: [sad §6 · Critical flow 1](../sad.md#6-runtime-view) — `TripBudgetPort` повертає base currency без budget; Critical flow 3 — `findById`, `withRate`
- 🧱 Building blocks: [sad §5](../sad.md#5-building-block-view) — рядки `expenses/domain/Expense.ts ~`, `errors.ts ~`
- 🗄 Data delta: [data-model · Domain ↔ columns](../data-model.md#domain--columns) — `Expense.rate?`, `rateSetAt?`; [Test fixtures](../data-model.md#test-fixtures) — `anExpense`
- 🔌 API: [openapi.yaml](../contracts/openapi.yaml) — `Expense.rate` (рядок або null) у відповідях `addExpense`, `setExpenseRate`; серіалізація — presenter у HTTP-1, не domain (api-sync-report F4)
- 📜 ADR: [ADR-0001](../adr/0001-expenses-rate-snapshot-as-nullable-column-on-expenses.md), [ADR-0004](../adr/0004-cross-base-currency-standalone-locked-via-rated-expenses-port.md) — форма `{ baseCurrency, budget }` порту

## Acceptance criteria (GWT)

- [ ] **AC-e1-1 (AC-01):** Given витрата 1999 CZK без курсу, when `expense.withRate(Rate.parse('0.0411'), now)`, then нова витрата має `rate` і `rateSetAt = now`, а `amount` — ті самі 1999 CZK.
- [ ] **AC-e1-2 (AC-05):** Given витрата з курсом `0.0411`, when `withRate(Rate.parse('0.0398'), later)`, then у новій витраті лише `0.0398` і `later` — старе значення не лежить ніде в об'єкті.
- [ ] **AC-e1-3 (AC-01):** Given конструктор `Expense` з `rate`, але без `rateSetAt`, when створити витрату, then кидається помилка — пара заповнюється лише разом.
- [ ] **AC-e1-4 (AC-05):** Given збережена витрата, when `findById` на `InMemoryExpenseRepository`, then повертається вона; невідомий id — `null`.

## Checklist (1 step ≈ 1 commit)

- [ ] Step 1 — `src/expenses/domain/Expense.ts`: `rate?: Rate`, `rateSetAt?: Date` у конструкторі (разом або жодне); `withRate(rate, at): Expense` без мутації.
- [ ] Step 2 — `ExpenseRepository` + `findById(id): Promise<Expense | null>`; реалізації в `InMemoryExpenseRepository.ts` і `PostgresExpenseRepository.ts` (за PK, наявні колонки — мапінг курсу додає EXP-5).
- [ ] Step 3 — `TripBudgetPort` → `{ baseCurrency: string | null, budget: Money | null }`; оновити адаптер `TripRepositoryBudgetPort.ts` і виклики в `AddExpense.ts`/`GetTripSummary.ts` без зміни поведінки (поведінка — EXP-2/EXP-4).
- [ ] Step 4 — `src/expenses/domain/errors.ts`: `ExpenseNotFoundError`, `BaseCurrencyNotSetError` — імена фіксовані кодами контракту.
- [ ] Step 5 — `src/expenses/testing/anExpense.ts` (фабрика з trip-budget T5) + `rate?`, `rateSetAt?`; `Expense.test.ts`: AC-e1-1..4.

## Edge cases

| Кейс | Поведінка |
|---|---|
| `res.json(expense)` з `Rate` на `BigInt` | Кидає «Do not know how to serialize a BigInt» — тому серіалізація лише через presenter HTTP-1, не `toJSON` у domain |
| Витрата у base currency | `rate` не пишеться; effective rate 1 рахується в EXP-4, не тут |
| Наявні фейки `ExpenseRepository` у тестах | Отримують `findById` — компіляція підкаже всі місця, вони в цьому ж PR |

## Definition of Done

- [ ] `Expense.test.ts` зелений на AC-e1-1..4 (AC-01, AC-05)
- [ ] `src/expenses/domain/` імпортує лише `src/shared/` — dependency-guard мовчить
- [ ] `node_modules/.bin/tsc --noEmit` зелений разом з обома репозиторіями, адаптером і фейками; `npx vitest run src/expenses` зелений — тести trip-budget не змінили результатів
- [ ] `tracker.md`: EXP-1 → `done`

## Notes

<!-- Сюди виконавець пише причину `blocked` і домовленості, що виникли під час роботи. -->
