---
id: T11
title: "Перевести POST /trips/{trip_id}/expenses і GET /trips/{trip_id}/summary на форму контракту з блоком budget"
layer: "ports"
deps: ["T6", "T10"]
acs: ["AC-03", "AC-03b", "AC-04", "AC-06", "AC-06b"]
files_hint: ["src/expenses/presentation/expensesRouter.ts", "src/expenses/presentation/expenses.http.test.ts", "src/expenses/presentation/budgetBlockPresenter.ts", "src/presentation/http.ts"]
owner: "Vladimir Makarov"
estimate: "L"
status: "todo"
---

# T11 — Перевести POST /trips/{trip_id}/expenses і GET /trips/{trip_id}/summary на форму контракту з блоком budget

## Why

Операції `addExpense` (envelope `{expense, budget}`, [ADR-0003](../adr/0003-overspend-signal-inline-in-add-expense-response.md)) і `getTripSummary` (`{lines, budget}`, [ADR-0002](../adr/0002-remaining-computed-in-expenses-via-trip-budget-port.md)) у [openapi.yaml](../contracts/openapi.yaml); flows — [sad §6](../sad.md) 2 і 3. AC: [PRD §AC-03](../PRD.md), [§AC-03b](../PRD.md), [§AC-04](../PRD.md), [§AC-06](../PRD.md), [§AC-06b](../PRD.md).

## What

- `src/expenses/presentation/expensesRouter.ts` — zod-схема за `AddExpenseRequest` (константа валюти з `src/presentation/http.ts`); `201` з `AddExpenseResponse`; `GET …/summary` → `200` з `TripSummary`; помилки — 404 `trip.not_found`, 409 `trip.not_accepting_expenses`, 422 `validation.invalid_payload` у форматі з `http.ts`.
- `src/expenses/presentation/budgetBlockPresenter.ts` — `BudgetBlock` → дріт (`Balance` → знаковий `remaining_minor`), одна форма для обох відповідей.
- `src/expenses/presentation/expenses.http.test.ts` — оновити наявні тести під нову форму, додати AC-тести.

## Definition of Done

- [ ] HTTP-тести зелені: витрата понад budget → 201, `budget.overspend: true`, від'ємний `remaining_minor` (AC-04, AC-03b); без budget → `budget: null`; summary → `lines` + `budget` з remaining = budget − Σ counted (AC-03); чужовалютні в `uncounted` (AC-06); усі чужовалютні → remaining = повний budget (AC-06b); наявні 404 / 409 / 422 зберігають статуси.
- [ ] Відповіді збігаються з прикладами `src/contracts/trip-budget.fixtures.ts` (`toEqual` на детермінованих даних).
- [ ] `npx tsc --noEmit` чистий, `npx vitest run` зелений.

## Notes

- Сигнатуру `expensesRouter(...)` і call-site в `app.ts` уже змінила T6; тут — лише маршрути й форма відповідей. Middleware — T12.
- **Передумова — рішення F2** ([api-sync-report](../contracts/api-sync-report.md)): у контракті змінюються не лише відповіді, а й поля запиту (`amount` → `amount_minor`, `currency` → `currency_code`, `spentAt` → `spent_at`) і формат помилок. Від цього рішення залежить обсяг задачі — тому L.
- `GET …/summary` для неіснуючої поїздки зараз віддає `200 []`; у контракті гілки 404 немає ([api-sync-report F3](../contracts/api-sync-report.md)) — поведінку не змінювати без рішення.
- Спільний `src/presentation/http.ts` з T10 → серіалізовано після T10.
