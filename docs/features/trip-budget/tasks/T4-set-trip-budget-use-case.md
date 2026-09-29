---
id: T4
title: "Додати use case SetTripBudget у BC trips"
layer: "app"
deps: ["T2"]
acs: ["AC-01", "AC-02", "AC-07", "AC-09"]
files_hint: ["src/trips/application/SetTripBudget.ts", "src/trips/application/SetTripBudget.test.ts"]
owner: "Vladimir Makarov"
estimate: "S"
status: "todo"
---

# T4 — Додати use case SetTripBudget у BC trips

## Why

Задання й заміна budget — одна дія = один use case ([sad §5](../sad.md), [sad §6 flow 1](../sad.md)). Покриває [PRD §AC-01](../PRD.md), [PRD §AC-02](../PRD.md), [PRD §AC-07](../PRD.md), [PRD §AC-09](../PRD.md); рішення — [ADR-0001](../adr/0001-budget-as-columns-on-trips.md).

## What

- `src/trips/application/SetTripBudget.ts` — клас з `execute({ tripId, budget })`: `findById` → немає → `TripDoesNotExistError`; є → `trip.setBudget(...)` → `save()` → повертає поїздку. Дозволено в будь-якому статусі.
- `src/trips/application/SetTripBudget.test.ts` — поверх `InMemoryTripRepository` і фабрики `aTrip` з T2.

## Definition of Done

- [ ] `npx vitest run src/trips/application/SetTripBudget.test.ts` зелений, назви `it(...)` читаються як AC: перше задання зберігається (AC-01); інша валюта → `BudgetCurrencyMismatchError`, стан не змінено (AC-02); заміна перераховується від нового значення, попереднього ніде немає (AC-07); finished-поїздка приймає budget (AC-09); невідома поїздка → `TripDoesNotExistError`.
- [ ] `src/trips/application/` не імпортує `infrastructure/` і `presentation/`.
- [ ] `npx tsc --noEmit` чистий.

## Notes

- Тест AC-09 створює finished-поїздку прямо в репозиторії: `FinishTrip` існує, але не змонтований у `tripsRouter` ([sad §11](../sad.md)). Монтування завершення поїздки поза контрактом фічі — задачею тут не заводиться.
- Паралельно з T3 і T5 (усі чекають лише T2 / T1).
