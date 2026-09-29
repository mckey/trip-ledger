---
id: EXP-2
title: "AddExpense приймає необов'язковий rate; курс без base currency → BaseCurrencyNotSetError"
epic: multi-currency-summary
project: trip-ledger
bc: expenses
layer: application
wave: 3
priority: Must
estimate: S
blocks: [HTTP-1]
blocked_by: [EXP-1]
external_blocked_by: ["trip-budget:T6"]
status: todo
owner: "Vladimir Makarov"
context_budget: ~2200 tokens
prd_refs: [AC-01, AC-06]
sad_refs: ["Critical flow 1"]
data_refs: [data-model.md#expenses-aggregate-root--bc-expenses]
openapi_ops: [addExpense]
adr_refs: ["0001", "0004"]
files: [src/expenses/application/AddExpense.ts, src/expenses/application/AddExpense.test.ts]
created: 2026-09-29
---

# EXP-2 · `AddExpense` з необов'язковим курсом

**Epic:** [multi-currency-summary](./_epic.md) · **Wave:** 3 · **Estimate:** S · **Owner:** Vladimir Makarov

## Місце в послідовності

- **Блокується:** EXP-1 (`Expense.rate`, `BaseCurrencyNotSetError`, форма `TripBudgetPort`); зовнішньо — trip-budget T6 (`AddExpense` уже повертає `{ expense, budget }` — той самий файл, тому послідовно).
- **Блокує:** HTTP-1 (маршрут додавання витрати).
- **Чому в цій хвилі:** application над domain з W2; паралельно з EXP-3/EXP-4/EXP-5 — файли не перетинаються.

## Why

Курс вводиться разом із витратою (US-01), а для витрати у base currency поле не потрібне взагалі (AC-06). Єдина нова відмова — курс «до нічого», коли у поїздки ще немає base currency.

## Linked artifacts (read-only — НЕ вставляти вміст)

- 🧭 Domain: [CONTEXT · Invariants](../CONTEXT.md#invariants) — «курс лише за наявної base currency»; [Glossary](../CONTEXT.md#glossary) — effective rate
- 🌐 Sequence: [sad §6 · Critical flow 1](../sad.md#6-runtime-view) — гілки `alt поїздка finished`, `alt курс вказано, а base currency у поїздки ще немає`, Note про AC-06
- 🗄 Data delta: [data-model · `expenses`](../data-model.md#expenses-aggregate-root--bc-expenses) — `rate_nano`/`rate_set_at` або обидва `NULL`
- 🔌 API: [openapi.yaml](../contracts/openapi.yaml) — `addExpense` → `AddExpenseRequest.rate`, `AddExpenseResponse`; помилка `expenses.base_currency_not_set` ([Sentinel errors](../CONTEXT.md#sentinel-errors))
- 📜 ADR: [ADR-0004](../adr/0004-cross-base-currency-standalone-locked-via-rated-expenses-port.md) — дзеркальне правило на боці expenses
- 📋 Тестовий слід: [sad §6](../sad.md#6-runtime-view) — чотири `it(...)` під flow 1

## Acceptance criteria (GWT)

- [ ] **AC-e2-1 (AC-01):** Given поїздка active з base currency `EUR`, when `AddExpense` з 1999 CZK і курсом `"0.0411"`, then збережена витрата має `rate = 0.0411` і `rateSetAt`, відповідь містить `expense.rate`.
- [ ] **AC-e2-2 (AC-01):** Given поїздка без base currency, when `AddExpense` з курсом, then `BaseCurrencyNotSetError` і `save` не викликався.
- [ ] **AC-e2-3 (AC-06):** Given поїздка з base currency `EUR`, when `AddExpense` з 500 EUR без курсу, then витрата збережена з `rate` відсутнім, а не записаним `1`.
- [ ] **AC-e2-4 (AC-01):** Given поїздка finished, when `AddExpense` з курсом, then `TripNotAcceptingExpensesError` — як і без курсу.

## Checklist (1 step ≈ 1 commit)

- [ ] Step 1 — `src/expenses/application/AddExpense.ts`: вхід + `rate?: Rate` (парсинг рядка — у presentation, сюди приходить уже `Rate`).
- [ ] Step 2 — Після `TripStatusPort` — `TripBudgetPort` читається завжди, як у flow 1 і в T6 (він живить `BudgetBlock` у відповіді); якщо `rate` є, а `baseCurrency === null` → `BaseCurrencyNotSetError` до `save`.
- [ ] Step 3 — Зберегти `new Expense(..., rate, rate ? now : undefined)`; годинник — через наявний спосіб у use case (не `new Date()` у тілі, якщо тести фіксують час).
- [ ] Step 4 — `src/expenses/application/AddExpense.test.ts`: AC-e2-1..4; назви — з тестового сліду flow 1.

## Edge cases

| Кейс | Поведінка |
|---|---|
| Курс на витраті у base currency | Upstream не вирішує (F3 фіксує лише `rate: null`) — відкрите питання в `_generation.md`; до рішення окремої гілки немає |
| Base currency є, budget немає | Курс приймається; `budget: null` у відповіді |
| Два читання поїздки (`TripStatusPort` + `TripBudgetPort`) | Відомий борг trip-budget SAD §11 — об'єднати, якщо QG-2 почне тиснути |

## Definition of Done

- [ ] `AddExpense.test.ts` зелений на AC-e2-1..4 (AC-01, AC-06)
- [ ] Жодна наявна перевірка trip-budget (`budget` в envelope) не зламана — її тести в тому ж файлі зелені
- [ ] `node_modules/.bin/tsc --noEmit`, `npx vitest run src/expenses/application` зелені
- [ ] `tracker.md`: EXP-2 → `done`

## Notes

<!-- Сюди виконавець пише причину `blocked` і домовленості, що виникли під час роботи. -->
