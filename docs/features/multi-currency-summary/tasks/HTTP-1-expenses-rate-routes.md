---
id: HTTP-1
title: "expensesRouter: rate у додаванні витрати і маршрут заміни курсу"
epic: multi-currency-summary
project: trip-ledger
bc: http
layer: presentation
wave: 4
priority: Must
estimate: M
blocks: [HTTP-3]
blocked_by: [EXP-2, EXP-3, EXP-5]
external_blocked_by: ["trip-budget:T12"]
status: todo
owner: "Vladimir Makarov"
context_budget: ~2400 tokens
prd_refs: [AC-01, AC-02, AC-05, AC-08]
sad_refs: ["Critical flow 1", "Critical flow 3"]
data_refs: ["none: HTTP-шар; схема — MIG-1, мапінг — EXP-5"]
openapi_ops: [addExpense, setExpenseRate]
adr_refs: ["0001", "0002"]
files: [src/expenses/presentation/expensesRouter.ts, src/expenses/presentation/expensePresenter.ts, src/expenses/presentation/expenses.http.test.ts]
created: 2026-09-29
---

# HTTP-1 · Маршрути курсу в `expensesRouter`

**Epic:** [multi-currency-summary](./_epic.md) · **Wave:** 4 · **Estimate:** M · **Owner:** Vladimir Makarov

## Місце в послідовності

- **Блокується:** EXP-2, EXP-3 (use cases), EXP-5 (курс переживає збереження в Postgres — без неї прод-шлях мовчки губив би курс); зовнішньо — trip-budget T12 (envelope T11, `http.ts` T10 і API key у `createApp`: HTTP-тести інакше довелося б переписувати двічі).
- **Блокує:** HTTP-3 — той самий `expensesRouter.ts` (file lane, E8).
- **Чому в цій хвилі:** перша presentation-story; паралельно з X-1 — файли різні (HTTP-2 іде в W5, після X-1).

## Why

Курс на дроті — рядок з обмеженням на знаки (ADR-0002); відмова з поясненням на нульовий чи від'ємний (AC-02) — ще до use case. Заміна курсу — окремий ресурс витрати (US-04, AC-08).

## Linked artifacts (read-only — НЕ вставляти вміст)

- 🔌 API: [openapi.yaml](../contracts/openapi.yaml) — `addExpense` (`AddExpenseRequest.rate`), `setExpenseRate` (`SetExpenseRateRequest`), схеми `Rate`, `ValidationIssue`; згенеровані типи — `src/contracts/multi-currency-summary.gen.ts`
- 🧩 Спільне з trip-budget: `src/presentation/http.ts` (T10) і `budgetBlockPresenter.ts` (T11) — використовувати, не дублювати; форму на дроті для них узгоджує trip-budget T0 (F1/F2), тому ця story стоїть після T12
- 🧭 Коди: [CONTEXT · Sentinel errors](../CONTEXT.md#sentinel-errors) — `http.validation_failed` 422, `expenses.base_currency_not_set` 422, `expenses.expense_not_found` 404
- 🌐 Sequence: [sad §6 · Critical flow 1](../sad.md#6-runtime-view) — `alt курс нульовий або від'ємний`; Critical flow 3 — `alt витрати немає`
- 📊 Звіт: [api-sync-report · Error codes](../contracts/api-sync-report.md#error-codes), [Closed open questions](../contracts/api-sync-report.md#closed-open-questions) — 9 знаків, без rate-limit
- 📜 ADR: [ADR-0002](../adr/0002-shared-rate-as-bigint-scaled-1e9-half-up.md) — чому рядок, а не JSON number
- 🗄 Data delta: none — HTTP-шар

## Acceptance criteria (GWT)

- [ ] **AC-h1-1 (AC-01):** Given поїздка з base currency, when додати витрату з `rate: "0.0411"`, then 201, `expense.rate === "0.041100000"` (9 знаків, F4), тіло задовольняє `AddExpenseResponse` з gen-типів.
- [ ] **AC-h1-2 (AC-02):** Given тіло з `rate: "0"`, `"-1"` або числом `0.5`, when додати витрату, then 422 `http.validation_failed`, у `details.issues` є елемент з `path === "rate"`.
- [ ] **AC-h1-3 (AC-05):** Given витрата з курсом, when замінити курс на `"24.3"`, then 200 і `rate === "24.300000000"` — попереднього значення у відповіді немає.
- [ ] **AC-h1-6 (AC-01):** Given поїздка без base currency, when додати витрату з курсом, then 422 `expenses.base_currency_not_set` — HTTP-половина `it('rejects a rate for a trip without base currency')` з тестового сліду flow 1.
- [ ] **AC-h1-4 (AC-08):** Given finished поїздка і витрата без курсу, when замінити курс, then 200 — не 409.
- [ ] **AC-h1-5 (AC-05):** Given невідомий `expenseId`, when замінити курс, then 404 `expenses.expense_not_found`.

## Checklist (1 step ≈ 1 commit)

- [ ] Step 1 — `src/expenses/presentation/expensesRouter.ts`: `rate` у схемі додавання — `z.string()` з тим самим `pattern`, що в контракті, далі `Rate.parse`.
- [ ] Step 2 — Маршрут заміни курсу (шлях — з контракту), `SetExpenseRate` у фабриці роутера з уже переданим `TripBudgetPort`.
- [ ] Step 3 — Мапінг `BaseCurrencyNotSetError` → 422, `ExpenseNotFoundError` → 404 через `http.ts` з trip-budget T10.
- [ ] Step 4 — `src/expenses/presentation/expensePresenter.ts`: `Expense` → дріт (`rate` — `toString()` з 9 знаками або `null`, `undefined → null`, F4); обидва маршрути віддають витрату лише через нього.
- [ ] Step 5 — `src/expenses/presentation/expenses.http.test.ts`: AC-h1-1..6, тіла відповідей — через `satisfies` згенерованих типів; таймінг заміни курсу (NFR PRD §6: p95 ≤ 150 ms) — одним тестом на 50 запитів.

## Edge cases

| Кейс | Поведінка |
|---|---|
| `rate: "1e-7"` | 422 — pattern не пропускає експоненту |
| `rate` на витраті у base currency | Не вирішено upstream — відкрите питання в `_generation.md`; до рішення окремої гілки немає |
| `node scripts/contracts.mjs gen` дав diff | Контракт не мінявся — diff означає, що код розійшовся з YAML; виправляти код |

## Definition of Done

- [ ] `expenses.http.test.ts` зелений на AC-h1-1..6 (AC-01, AC-02, AC-05, AC-08); `expensePresenter.ts` — єдине місце серіалізації витрати
- [ ] `node scripts/contracts.mjs lint multi-currency-summary` — 0 problems; `gen` не дає diff
- [ ] `node_modules/.bin/tsc --noEmit`, `npx vitest run src/expenses/presentation` зелені
- [ ] `tracker.md`: HTTP-1 → `done`

## Notes

<!-- Сюди виконавець пише причину `blocked` і домовленості, що виникли під час роботи. -->
