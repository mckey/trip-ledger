---
type: epic
project: trip-ledger
feature: multi-currency-summary
created: 2026-09-29
stories_total: 15
waves: 6
feature_size: S
depends_on_epics: [trip-budget]
---

# Epic: multi-currency-summary

> [PRD](../PRD.md) · [SAD](../sad.md) · [data-model](../data-model.md) · [openapi](../contracts/openapi.yaml) · [ADR](../adr/) · [CONTEXT](../CONTEXT.md) · [tracker](./tracker.md) · [provenance](./_generation.md) · [tasks.json](./tasks.json)

## Проблема

Закордонна поїздка — це 2–3 валюти, а підсумок по валютах окремо не відповідає на «скільки я реально витратив». Залишок з trip-budget порівнює лише витрати в base currency: у серпневій поїздці поза порівнянням лишилось ~40% суми, і лічильник неврахованих виявився милицею ([PRD §1](../PRD.md#1-context)).

## Рішення

Approach C з idea-brief: необов'язковий rate snapshot прямо на витраті, зафіксований до base currency і виправний постфактум, навіть після завершення поїздки. Підсумок показує converted total поруч із сирими сумами і чесний лічильник витрат без курсу; витрата з курсом входить у залишок бюджету (AC-09). Base currency стає самостійним атрибутом поїздки й блокується явними курсами — перший двонапрямний порт між BC ([ADR-0004](../adr/0004-cross-base-currency-standalone-locked-via-rated-expenses-port.md)). Зовнішніх курсів немає.

Епік стоїть на trip-budget: `Balance`, `BudgetBlock`, `TripBudgetPort`, колонки budget/base currency і API key приходять звідти ([tracker trip-budget](../../trip-budget/tasks/tracker.md)).

## Progress

### Wave 1 — фундамент без блокерів усередині епіку (4, паралельно)

- [ ] [DOC-1 · Back-port словників, PRD §9, документів trip-budget, ARCHITECTURE](./DOC-1-backport-glossary-and-prd.md) — S — Must
- [ ] [SHR-1 · Value object `Rate`](./SHR-1-rate-value-object.md) — M — Must
- [ ] [TRP-1 · `Trip.setBaseCurrency` + лок](./TRP-1-trip-base-currency-lock.md) — M — Must · extern trip-budget:T2
- [ ] [MIG-1 · Промоція staged-міграції rate snapshot](./MIG-1-promote-rate-snapshot-migration.md) — S — Must · extern trip-budget:T3

### Wave 2 — domain expenses і use case trips (2, паралельно)

- [ ] [EXP-1 · `Expense.rate`, `findById`, помилки, `TripBudgetPort` з baseCurrency](./EXP-1-expense-rate-attribute-and-ports.md) — L — Must · extern trip-budget:T6, T8
- [ ] [TRP-2 · `SetTripBaseCurrency` + `CreateTrip(baseCurrency?)`](./TRP-2-set-trip-base-currency-use-case.md) — S — Must

### Wave 3 — use cases і репозиторії (4, паралельно — файли не перетинаються)

- [ ] [EXP-4 · Converted total у `BudgetBlock`](./EXP-4-converted-total-in-budget-block.md) — L — Must · extern trip-budget:T6
- [ ] [EXP-5 · Репозиторії: мапінг курсу, `hasRatedExpenses`](./EXP-5-expense-repositories-rate-mapping.md) — M — Must
- [ ] [EXP-2 · `AddExpense` з курсом](./EXP-2-add-expense-with-optional-rate.md) — S — Must · extern trip-budget:T6
- [ ] [EXP-3 · `SetExpenseRate`](./EXP-3-set-expense-rate-use-case.md) — S — Must

### Wave 4 — адаптер зворотного порту і HTTP витрат (2, паралельно)

- [ ] [X-1 · `ExpenseRepositoryRatedPort`](./X-1-rated-expenses-port-adapter.md) — S — Must
- [ ] [HTTP-1 · Маршрути курсу витрати + presenter](./HTTP-1-expenses-rate-routes.md) — M — Must · extern trip-budget:T12

### Wave 5 — HTTP (2, паралельно)

- [ ] [HTTP-2 · Маршрути base currency + зшивання в `app.ts`](./HTTP-2-trips-base-currency-routes-and-wiring.md) — M — Must · extern trip-budget:T12
- [ ] [HTTP-3 · Блок `converted` у підсумку + латентність](./HTTP-3-summary-converted-block.md) — S — Must · extern trip-budget:T12

### Wave 6 — наскрізний сценарій (1)

- [ ] [E2E-1 · Мультивалютна поїздка наскрізь](./E2E-1-multi-currency-journey.md) — M — Must

**Разом:** 0/15 done; ~54 год ≈ 6.75 людино-днів; критичний шлях — SHR-1 → EXP-1 → EXP-5 → X-1 → HTTP-2 → E2E-1 (і паралельна гілка EXP-5 → HTTP-1 → HTTP-3 → E2E-1).

## Dependencies

Формат — як у прикладі курсу: рядки = хвилі (усередині рядка паралельно), `◄` — `blocked_by`; рядок `extern` — stories trip-budget, без яких рядок не стартує. Список звіряє з frontmatter гейт E9 (`check-tasks.mjs`).

```text
extern   tb:T2 ► TRP-1 · tb:T3 ► MIG-1 · tb:T6 ► EXP-1, EXP-2, EXP-4 · tb:T8 ► EXP-1 · tb:T12 ► HTTP-1, HTTP-2, HTTP-3

Wave 1   DOC-1 · SHR-1 · TRP-1 · MIG-1          — без блокерів усередині епіку
Wave 2   EXP-1 ◄ SHR-1          TRP-2 ◄ TRP-1
Wave 3   EXP-2 ◄ EXP-1          EXP-3 ◄ EXP-1          EXP-4 ◄ SHR-1, EXP-1
         EXP-5 ◄ EXP-1, MIG-1
Wave 4   X-1 ◄ TRP-1, EXP-5     HTTP-1 ◄ EXP-2, EXP-3, EXP-5
Wave 5   HTTP-2 ◄ TRP-2, X-1    HTTP-3 ◄ EXP-4, HTTP-1   — file lane: expensesRouter.ts
Wave 6   E2E-1 ◄ HTTP-2, HTTP-3
```

Критичний шлях (6 хвиль):

```text
SHR-1 ──► EXP-1 ──► EXP-5 ──► X-1 ─────► HTTP-2 ──► E2E-1
                       └────► HTTP-1 ──► HTTP-3 ──┘
```

Той самий граф — у [tracker.md](./tracker.md) (Blocked by / External) і в [tasks.json](./tasks.json) (`deps`, `external_deps`).

## Ризики / Hard rules

- **Порядок епіків.** 8 з 15 stories мають зовнішні блокери (5 stories trip-budget: T2, T3, T6, T8, T12); trip-budget іде першою ([sad §11](../sad.md#11-risks-and-technical-debt), рядок «Порядок реалізації»). Разом з її ~6.5 днями (з T0) — ~13.25 людино-днів до жовтневої поїздки (PRD §1): якщо не вміщається, лінію зрізу проводимо по E2E-1 і DOC-1 після коду, а не по функціональних stories.
- **Два контракти на одні ендпойнти.** trip-budget (готовий api-forge: snake_case, `/api/v1`, Bearer) і ця фіча (contract-forge: camelCase as-built, `X-API-Key`) описують ті самі `addExpense`/`getTripSummary` по-різному. Узгодження — trip-budget T0 (прогін contract-forge `--update`, F1/F2), від неї залежать T10–T12, а через T12 — усі HTTP-stories тут. Див. [_generation · Open questions](./_generation.md#open-questions-surfaced-during-slicing).
- **Dependency rule (CLAUDE.md).** Імпорт між BC — лише в `infrastructure/` адаптерах (X-1 і наявні); domain/application чисті — dependency-guard (trip-kit).
- **Промоція міграцій.** Лише за [Promotion order](../data-model.md#promotion-order) з перештампуванням у 17 знаків; `…140100` (CHECK-и `trips`) промотує trip-budget T3 тим самим деплоєм, MIG-1 — лише `…140000`.
- **Точність.** Жодного `Number`/`parseFloat` на шляху курсу від zod до БД ([ADR-0002](../adr/0002-shared-rate-as-bigint-scaled-1e9-half-up.md)); курс на дроті — рядок з 9 знаками (F4).

## Метрики

- Частка суми поїздки у converted total ≥ 95% за наступні дві мультивалютні поїздки ([PRD §7](../PRD.md#7-metrics--kpis)); джерело — підсумок, без нових таблиць.
- Частка курсів, введених у день витрати, ≥ 80% — рахується з `rate_set_at` проти `spent_at` (EXP-5 пише, SQL-запит раз на поїздку).
- p95 підсумку ≤ 250 ms на 300 витратах — фіксується в PR HTTP-3.
