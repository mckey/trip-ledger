---
id: T2
title: "Додати budget, base currency і setBudget() у доменну сутність Trip"
layer: "domain"
deps: []
acs: ["AC-01", "AC-02", "AC-07", "AC-09"]
files_hint: ["src/trips/domain/Trip.ts", "src/trips/domain/errors.ts", "src/trips/domain/Trip.test.ts", "src/trips/testing/aTrip.ts"]
owner: "Vladimir Makarov"
estimate: "M"
status: "todo"
---

# T2 — Додати budget, base currency і setBudget() у доменну сутність Trip

## Why

Budget — атрибут поїздки, а не окрема сутність ([ADR-0001](../adr/0001-budget-as-columns-on-trips.md)). Правила задання й заміни беруться з [PRD §AC-01](../PRD.md), [PRD §AC-02](../PRD.md), [PRD §AC-07](../PRD.md), [PRD §AC-09](../PRD.md); форма атрибутів — [sad §5](../sad.md) і [data-model.md](../data-model.md) (`trips.budget_minor`, `base_currency`, `budget_set_at`).

## What

- `src/trips/domain/Trip.ts` — поля `budget?: Money`, `baseCurrency?: string`, `budgetSetAt?: Date`; метод `setBudget(money, now)`: перше задання фіксує base currency, заміна в іншій валюті → `BudgetCurrencyMismatchError`, нульова сума відкидається (AC-02), значення перезаписується без журналу (AC-07). Статус поїздки на `setBudget()` не впливає (AC-09); `canAcceptExpenses()` від budget не залежить.
- `src/trips/domain/errors.ts` — нові помилки BC trips: `TripDoesNotExistError`, `BudgetCurrencyMismatchError` ([sad §5](../sad.md), [sad §8](../sad.md) «Error handling»).
- `src/trips/testing/aTrip.ts` — фабрика фікстур за [data-model.md §Test fixtures](../data-model.md).
- `src/trips/domain/Trip.test.ts` — юніт-тести на `setBudget()`.

## Definition of Done

- [ ] `npx vitest run src/trips/domain/Trip.test.ts` зелений: перше задання фіксує base currency; заміна в тій самій валюті перезаписує суму і `budgetSetAt`; заміна в іншій валюті кидає `BudgetCurrencyMismatchError`; нуль відкидається; `setBudget()` на finished-поїздці проходить.
- [ ] Наявні `CreateTrip.test.ts` / `FinishTrip.test.ts` зелені без змін (нові поля опціональні).
- [ ] `src/trips/domain/` не імпортує нічого з `expenses/`, фреймворків і zod.
- [ ] `npx tsc --noEmit` чистий.

## Notes

- Точне правило «додатна сума» живе тут і в zod (T10), не в БД: [ADR-0001 Amendment](../adr/0001-budget-as-columns-on-trips.md), [api-sync-report F1](../contracts/api-sync-report.md).
- Після цієї задачі `res.json(trip)` у `GET /trips/:id` почне віддавати нові поля ([api-sync-report F6](../contracts/api-sync-report.md)) — закривається презентером у T10.
- Паралельна гілка: стартує разом з T1.
