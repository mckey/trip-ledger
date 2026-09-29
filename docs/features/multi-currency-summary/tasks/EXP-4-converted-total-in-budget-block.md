---
id: EXP-4
title: "BudgetBlock і GetTripSummary: counted за effective rate, блок converted { total, withoutRate } | null"
epic: multi-currency-summary
project: trip-ledger
bc: expenses
layer: application
wave: 3
priority: Must
estimate: L
blocks: [HTTP-3]
blocked_by: [SHR-1, EXP-1]
external_blocked_by: ["trip-budget:T6"]
status: todo
owner: "Vladimir Makarov"
context_budget: ~2600 tokens
prd_refs: [AC-03, AC-03b, AC-04, AC-06, AC-09]
sad_refs: ["Critical flow 2"]
data_refs: ["none: читає наявні колонки через репозиторій; нових полів не пише"]
openapi_ops: [getTripSummary]
adr_refs: ["0002", "0003"]
files: [src/expenses/application/BudgetBlock.ts, src/expenses/application/BudgetBlock.test.ts, src/expenses/application/GetTripSummary.ts, src/expenses/application/GetTripSummary.test.ts]
created: 2026-09-29
---

# EXP-4 · Converted total і нова межа counted

**Epic:** [multi-currency-summary](./_epic.md) · **Wave:** 3 · **Estimate:** L · **Owner:** Vladimir Makarov

## Місце в послідовності

- **Блокується:** SHR-1 (`Rate.apply`), EXP-1 (`Expense.rate`, порт з `baseCurrency`); зовнішньо — trip-budget T6 (`GetTripSummary` вже повертає `{ lines, budget }`, `BudgetBlock` з T5).
- **Блокує:** HTTP-3 (серіалізація блоку `converted`).
- **Чому в цій хвилі:** ядро фічі; L — найбільша story, але одна функція, ділити на «total» і «remaining» означало б розвести їх (ADR-0003 саме про те, щоб не розводити).

## Why

Підсумок відповідає «скільки я реально витратив» однією сумою (US-02), чесно показує дірку (US-03), а залишок бюджету перестає брехати (AC-09). Усе з однієї множини counted: effective rate = явний курс або 1 для base currency.

## Linked artifacts (read-only — НЕ вставляти вміст)

- 🧭 Domain: [CONTEXT · Glossary](../CONTEXT.md#glossary) — effective rate, converted total, raw totals, without-rate count, counted expense; [Invariants](../CONTEXT.md#invariants) — «одна функція», «не мутує»
- 🌐 Sequence: [sad §6 · Critical flow 2](../sad.md#6-runtime-view) — `alt base currency не задана` → `converted: null`; Note про `BudgetBlock`
- 🔌 API: [openapi.yaml](../contracts/openapi.yaml) — `getTripSummary` → `TripSummary`, `ConvertedTotal`, `BudgetBlock`
- 📜 ADR: [ADR-0003](../adr/0003-expenses-counted-means-has-effective-rate.md) — межа counted; [ADR-0002](../adr/0002-shared-rate-as-bigint-scaled-1e9-half-up.md) — half-up
- 📐 Якість: [sad §10 · QG-1, QG-3](../sad.md#10-quality-requirements) — точність і «не мутує»
- 🗄 Data delta: none — нових колонок не пише
- 📋 Тестовий слід: [sad §6](../sad.md#6-runtime-view) — чотири `it(...)` під flow 2

## Acceptance criteria (GWT)

- [ ] **AC-e4-1 (AC-03):** Given base currency `EUR`, витрати 50 EUR, 1999 CZK з курсом `0.0411`, 30 USD без курсу, when `GetTripSummary`, then `lines` — три сирі суми як раніше, `converted.total` = 50 EUR + перерахована CZK.
- [ ] **AC-e4-2 (AC-04):** Given той самий набір, when `GetTripSummary`, then `converted.withoutRate = 1`.
- [ ] **AC-e4-3 (AC-03b):** Given витрата 100 000 000 VND з курсом `0.000037037`, when `GetTripSummary`, then її внесок у total — 3704, не 0.
- [ ] **AC-e4-4 (AC-09):** Given budget 1000 EUR і CZK-витрата з курсом, when `GetTripSummary`, then `budget.remaining` враховує перераховану CZK, а лічильник uncounted у `budget` = `withoutRate`.
- [ ] **AC-e4-5 (AC-06):** Given поїздка без base currency, when `GetTripSummary`, then `converted: null`, `budget: null`, `lines` — як до фічі.

## Checklist (1 step ≈ 1 commit)

- [ ] Step 1 — `src/expenses/application/BudgetBlock.ts`: функція effective rate (`rate` / `Rate.ONE` для base currency / відсутній).
- [ ] Step 2 — Counted = має effective rate; Σ counted — через `Rate.apply` у base currency; `remaining` — `Balance` з trip-budget над цією сумою.
- [ ] Step 3 — Той самий прохід рахує `converted: { total, withoutRate }` — одна ітерація, два виходи.
- [ ] Step 4 — `src/expenses/application/GetTripSummary.ts`: `converted` поруч з `lines` і `budget`; `null`, коли порт повертає `baseCurrency: null`.
- [ ] Step 5 — `BudgetBlock.test.ts`: межа counted (явний / похідний 1 / без курсу), half-up; перенести тести trip-budget, що спирались на «counted = у base currency».
- [ ] Step 6 — `GetTripSummary.test.ts`: AC-e4-1..5 + `it('conversion does not mutate stored expenses')` з QG-3.

## Edge cases

| Кейс | Поведінка |
|---|---|
| Base currency змінили після витрат у старій валюті | Вони без effective rate → у `withoutRate`, не в total (ADR-0004) |
| Усі витрати без курсу | `converted.total` = 0 у base currency, `withoutRate` = N; не `null` |
| Тести trip-budget «витрата в іншій валюті uncounted» | Лишаються зеленими: без курсу вона й далі uncounted |

## Definition of Done

- [ ] `GetTripSummary.test.ts` і `BudgetBlock.test.ts` зелені на AC-e4-1..5 (AC-03, AC-03b, AC-04, AC-06, AC-09)
- [ ] Converted total і remaining рахуються в одному проході однієї функції — у PR показано, що другого місця Σ немає
- [ ] `node_modules/.bin/tsc --noEmit`, `npx vitest run src/expenses` зелені
- [ ] `tracker.md`: EXP-4 → `done`

## Notes

<!-- Сюди виконавець пише причину `blocked` і домовленості, що виникли під час роботи. -->
