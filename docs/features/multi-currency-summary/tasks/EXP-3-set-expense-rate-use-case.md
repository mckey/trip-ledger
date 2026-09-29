---
id: EXP-3
title: "Use case SetExpenseRate: заміна курсу на збереженій витраті, дозволена у finished"
epic: multi-currency-summary
project: trip-ledger
bc: expenses
layer: application
wave: 3
priority: Must
estimate: S
blocks: [HTTP-1]
blocked_by: [EXP-1]
external_blocked_by: []
status: todo
owner: "Vladimir Makarov"
context_budget: ~2200 tokens
prd_refs: [AC-05, AC-08]
sad_refs: ["Critical flow 3"]
data_refs: [data-model.md#expenses-aggregate-root--bc-expenses]
openapi_ops: [setExpenseRate]
adr_refs: ["0001"]
files: [src/expenses/application/SetExpenseRate.ts, src/expenses/application/SetExpenseRate.test.ts]
created: 2026-09-29
---

# EXP-3 · `SetExpenseRate`

**Epic:** [multi-currency-summary](./_epic.md) · **Wave:** 3 · **Estimate:** S · **Owner:** Vladimir Makarov

## Місце в послідовності

- **Блокується:** EXP-1 (`findById`, `withRate`, `ExpenseNotFoundError`).
- **Блокує:** HTTP-1 (маршрут заміни курсу).
- **Чому в цій хвилі:** новий файл, паралельно з EXP-2/EXP-4.

## Why

Переплутаний напрямок курсу чи забуте поле — буденна правка (US-04), і вона мусить працювати після завершення поїздки (US-06, AC-08). Тому use case свідомо **не** питає `TripStatusPort` — finished забороняє нові витрати, не атрибути наявних.

## Linked artifacts (read-only — НЕ вставляти вміст)

- 🧭 Domain: [CONTEXT · Glossary](../CONTEXT.md#glossary) — дозаповнення курсу, rate snapshot; [Invariants](../CONTEXT.md#invariants) — finished і дозаповнення курсу
- 🌐 Sequence: [sad §6 · Critical flow 3](../sad.md#6-runtime-view) — перша частина: `alt витрати немає`, Note «статус поїздки НЕ перевіряється»
- 🗄 Data delta: [data-model · `expenses`](../data-model.md#expenses-aggregate-root--bc-expenses) — `rate_set_at` перезаписується, не журнал
- 🔌 API: [openapi.yaml](../contracts/openapi.yaml) — `setExpenseRate` → `SetExpenseRateRequest`, відповідь `Expense`; помилки `expenses.expense_not_found`, `expenses.base_currency_not_set`
- 📜 ADR: [ADR-0001](../adr/0001-expenses-rate-snapshot-as-nullable-column-on-expenses.md) — окремий use case без перевірки статусу
- 📋 Тестовий слід: [sad §6](../sad.md#6-runtime-view) — три `it(...)` для `SetExpenseRate.test.ts`

## Acceptance criteria (GWT)

- [ ] **AC-e3-1 (AC-08):** Given витрата без курсу у finished поїздці з base currency, when `SetExpenseRate.execute(id, Rate.parse('0.0411'))`, then курс збережено, `TripStatusPort` не викликався.
- [ ] **AC-e3-2 (AC-05):** Given витрата з курсом `0.0411`, when `execute(id, Rate.parse('24.3'))`, then у сховищі лише `24.3`, `rateSetAt` оновлено, сума й валюта ті самі.
- [ ] **AC-e3-3 (AC-05):** Given неіснуючий `expenseId`, when `execute`, then `ExpenseNotFoundError`.
- [ ] **AC-e3-4 (AC-08):** Given витрата у поїздці без base currency, when `execute`, then `BaseCurrencyNotSetError`, нічого не збережено.

## Checklist (1 step ≈ 1 commit)

- [ ] Step 1 — `src/expenses/application/SetExpenseRate.ts`: залежності — `ExpenseRepository`, `TripBudgetPort`, годинник; **без** `TripStatusPort`.
- [ ] Step 2 — `findById` → `null` → `ExpenseNotFoundError`; `TripBudgetPort` за `expense.tripId` → `baseCurrency === null` → `BaseCurrencyNotSetError`.
- [ ] Step 3 — `repo.save(expense.withRate(rate, now))` — наявний upsert, без нового методу.
- [ ] Step 4 — `src/expenses/application/SetExpenseRate.test.ts`: AC-e3-1..4 + назви з тестового сліду flow 3.

## Edge cases

| Кейс | Поведінка |
|---|---|
| Той самий курс повторно | Зберігається, `rateSetAt` оновлюється — це правка owner-а, KPI її рахує |
| Витрата у base currency, курс ≠ 1 | Upstream не вирішує — відкрите питання в `_generation.md` (як і в EXP-2) |
| Прибрати курс (`null`) | Не у v1 — контракт приймає лише додатний курс |

## Definition of Done

- [ ] `SetExpenseRate.test.ts` зелений на AC-e3-1..4 (AC-05, AC-08)
- [ ] У `SetExpenseRate.ts` немає імпорту `TripStatusPort` — перевіряється рев'ю, бо це рішення ADR-0001
- [ ] `node_modules/.bin/tsc --noEmit`, `npx vitest run src/expenses/application` зелені
- [ ] `tracker.md`: EXP-3 → `done`

## Notes

<!-- Сюди виконавець пише причину `blocked` і домовленості, що виникли під час роботи. -->
