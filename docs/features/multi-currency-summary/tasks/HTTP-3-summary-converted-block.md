---
id: HTTP-3
title: "Маршрут підсумку віддає блок converted { total, withoutRate } | null"
epic: multi-currency-summary
project: trip-ledger
bc: http
layer: presentation
wave: 5
priority: Must
estimate: S
blocks: [E2E-1]
blocked_by: [EXP-4, HTTP-1]
external_blocked_by: ["trip-budget:T12"]
status: todo
owner: "Vladimir Makarov"
context_budget: ~2200 tokens
prd_refs: [AC-03, AC-03b, AC-04, AC-09]
sad_refs: ["Critical flow 2"]
data_refs: ["none: HTTP-шар"]
openapi_ops: [getTripSummary]
adr_refs: [0003]
files: [src/expenses/presentation/expensesRouter.ts, src/expenses/presentation/expenses.http.test.ts]
created: 2026-09-29
---

# HTTP-3 · Блок `converted` у підсумку

**Epic:** [multi-currency-summary](./_epic.md) · **Wave:** 5 · **Estimate:** S · **Owner:** Vladimir Makarov

## Місце в послідовності

- **Блокується:** EXP-4 (обчислення), HTTP-1 — той самий `expensesRouter.ts` і тест-файл (file lane, E8); зовнішньо — trip-budget T12 (T11 уже віддає `{ lines, budget }`).
- **Блокує:** E2E-1.
- **Чому в цій хвилі:** єдина причина бути в W5, а не W4, — спільний файл з HTTP-1; логічно вона незалежна.

## Why

Підсумок показує converted total поруч із сирими сумами, а не замість них (US-02), і лічильник без курсу (US-03). На дроті `Money` — `{ amount, currency }`, `null` — коли у поїздки немає base currency.

## Linked artifacts (read-only — НЕ вставляти вміст)

- 🔌 API: [openapi.yaml](../contracts/openapi.yaml) — `getTripSummary` → `TripSummary.converted` (`ConvertedTotal`), `BudgetBlock`
- 🧭 Domain: [CONTEXT · Glossary](../CONTEXT.md#glossary) — converted total, without-rate count, raw totals
- 🌐 Sequence: [sad §6 · Critical flow 2](../sad.md#6-runtime-view) — обидві гілки `alt base currency …`
- 📐 Якість: [sad §10 · QG-2](../sad.md#10-quality-requirements) — p95 ≤ 250 ms, тест у тому ж `expenses.http.test.ts`
- 📜 ADR: [ADR-0003](../adr/0003-expenses-counted-means-has-effective-rate.md)
- 🗄 Data delta: none — HTTP-шар

## Acceptance criteria (GWT)

- [ ] **AC-h3-1 (AC-03):** Given поїздка з `EUR` і витратами у трьох валютах, частина з курсом, when прочитати підсумок, then `lines` — сирі суми, `converted.total` — `{ amount, currency: "EUR" }`.
- [ ] **AC-h3-2 (AC-04):** Given та сама поїздка, when прочитати підсумок, then `converted.withoutRate` — ціле число витрат без effective rate.
- [ ] **AC-h3-3 (AC-03b):** Given VND-витрата з курсом `"0.000037037"`, when прочитати підсумок, then `converted.total.amount` > 0 і `amount` — JSON integer.
- [ ] **AC-h3-4 (AC-03):** Given поїздка без base currency, when прочитати підсумок, then `converted: null` і відповідь задовольняє `TripSummary` з gen-типів.
- [ ] **AC-h3-5 (AC-09):** Given budget 1000 EUR і CZK-витрата з курсом, when прочитати підсумок, then `budget.remaining` менший за budget рівно на перераховану суму, а лічильник uncounted у `budget` дорівнює `converted.withoutRate`.
- [ ] **AC-h3-6 (NFR PRD §6):** Given 300 витрат у 3 валютах, частина з курсом, when 50 разів прочитати підсумок, then p95 < 250 ms — `it('summary with converted total responds under 250 ms for 300 mixed-currency expenses')` (sad §10 QG-2).

## Checklist (1 step ≈ 1 commit)

- [ ] Step 1 — `src/expenses/presentation/expensesRouter.ts`: серіалізація `converted`: `total` — `Money` як `{ amount, currency }` за контрактом, тією ж формою, що `budgetBlockPresenter.ts` з trip-budget T11 віддає для `budget`.
- [ ] Step 2 — `budget` серіалізує `budgetBlockPresenter.ts` з trip-budget T11 — не чіпати, лише перевірити AC-h3-5 тестом.
- [ ] Step 3 — `src/expenses/presentation/expenses.http.test.ts`: AC-h3-1..5 з `satisfies` типу відповіді.
- [ ] Step 4 — Той самий файл: латентність AC-h3-6 — сид 300 витрат напряму в репозиторій, таймінги supertest.

## Edge cases

| Кейс | Поведінка |
|---|---|
| `converted.total` як `BigInt` у JSON | `Money.amount` — safe integer (SHR-1), тому `JSON.stringify` не падає |
| Поїздка з base currency, без витрат | `converted: { total: 0, withoutRate: 0 }`, не `null` |

## Definition of Done

- [ ] `expenses.http.test.ts` зелений на AC-h3-1..6 (AC-03, AC-03b, AC-04, AC-09); p95 записаний у PR-описі
- [ ] `node scripts/contracts.mjs lint multi-currency-summary` — 0 problems; `gen` без diff
- [ ] `node_modules/.bin/tsc --noEmit`, `npx vitest run src/expenses/presentation` зелені
- [ ] `tracker.md`: HTTP-3 → `done`

## Notes

<!-- Сюди виконавець пише причину `blocked` і домовленості, що виникли під час роботи. -->
