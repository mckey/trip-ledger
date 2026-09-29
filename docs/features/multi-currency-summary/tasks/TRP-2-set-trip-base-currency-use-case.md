---
id: TRP-2
title: "Use case SetTripBaseCurrency і необов'язкова baseCurrency у CreateTrip"
epic: multi-currency-summary
project: trip-ledger
bc: trips
layer: application
wave: 2
priority: Must
estimate: S
blocks: [HTTP-2]
blocked_by: [TRP-1]
external_blocked_by: []
status: todo
owner: "Vladimir Makarov"
context_budget: ~2200 tokens
prd_refs: [AC-06, AC-07]
sad_refs: ["Critical flow 3"]
data_refs: [data-model.md#trips-aggregate-root--bc-trips]
openapi_ops: [setTripBaseCurrency, createTrip]
adr_refs: [0004]
files: [src/trips/application/SetTripBaseCurrency.ts, src/trips/application/SetTripBaseCurrency.test.ts, src/trips/application/CreateTrip.ts, src/trips/application/CreateTrip.test.ts]
created: 2026-09-29
---

# TRP-2 · `SetTripBaseCurrency` + `CreateTrip(baseCurrency?)`

**Epic:** [multi-currency-summary](./_epic.md) · **Wave:** 2 · **Estimate:** S · **Owner:** Vladimir Makarov

## Місце в послідовності

- **Блокується:** TRP-1 (`Trip.setBaseCurrency`, `RatedExpensesPort`).
- **Блокує:** HTTP-2 (маршрути trips).
- **Чому в цій хвилі:** use case над сутністю з W1.

## Why

Base currency можна задати при створенні поїздки або окремою дією — без неї немає effective rate 1 (AC-06) і немає converted total. Use case — єдине місце, що питає порт перед зміною (AC-07).

## Linked artifacts (read-only — НЕ вставляти вміст)

- 🧭 Domain: [CONTEXT · Invariants](../CONTEXT.md#invariants) — лок base currency; [Sentinel errors](../CONTEXT.md#sentinel-errors) — `BaseCurrencyLockedError`, `TripDoesNotExistError`
- 🌐 Sequence: [sad §6 · Critical flow 3](../sad.md#6-runtime-view) — `SetTripBaseCurrency(tripId, currency)`, Note «перше задання порт не питає»
- 🗄 Data delta: [data-model · `trips`](../data-model.md#trips-aggregate-root--bc-trips) — upsert по PK
- 🔌 API: [openapi.yaml](../contracts/openapi.yaml) — `setTripBaseCurrency` (`SetBaseCurrencyRequest`), `createTrip` (`CreateTripRequest.baseCurrency`)
- 📜 ADR: [ADR-0004](../adr/0004-cross-base-currency-standalone-locked-via-rated-expenses-port.md)
- 📋 Тестовий слід: [sad §6](../sad.md#6-runtime-view) — три `it(...)` для `SetTripBaseCurrency.test.ts` під flow 3

## Acceptance criteria (GWT)

- [ ] **AC-t2-1 (AC-07):** Given поїздка з `EUR` і фейковий `RatedExpensesPort` → `true`, when `SetTripBaseCurrency.execute(id, 'PLN')`, then `BaseCurrencyLockedError`, репозиторій не викликав `save`.
- [ ] **AC-t2-2 (AC-07):** Given поїздка без base currency і порт, що кидає при виклику, when `execute(id, 'EUR')`, then валюта збережена — порт не питався.
- [ ] **AC-t2-3 (AC-06):** Given `CreateTrip.execute({ …, baseCurrency: 'EUR' })`, when поїздку прочитати з репозиторію, then `baseCurrency = 'EUR'` без budget.
- [ ] **AC-t2-4 (AC-07):** Given неіснуючий `tripId`, when `execute`, then `TripDoesNotExistError`.

## Checklist (1 step ≈ 1 commit)

- [ ] Step 1 — `src/trips/application/SetTripBaseCurrency.ts`: `execute(tripId, currency)`; порт питається лише коли валюта вже задана й відрізняється.
- [ ] Step 2 — `src/trips/application/CreateTrip.ts`: необов'язкова `baseCurrency` у вході, через `trip.setBaseCurrency(c, false)`.
- [ ] Step 3 — `SetTripBaseCurrency.test.ts`: AC-t2-1, t2-2, t2-4 + назви тестів із тестового сліду flow 3.
- [ ] Step 4 — `CreateTrip.test.ts`: AC-t2-3 і регрес «без baseCurrency — як раніше».

## Edge cases

| Кейс | Поведінка |
|---|---|
| Та сама валюта повторно | no-op без звернення до порту |
| Порт кидає (БД недоступна) | Помилка йде вгору як 500; лок не «відкривається» мовчки |

## Definition of Done

- [ ] `SetTripBaseCurrency.test.ts` і `CreateTrip.test.ts` зелені (AC-07, AC-06)
- [ ] `src/trips/application/` не імпортує `infrastructure/` — лише порт з domain
- [ ] `node_modules/.bin/tsc --noEmit`, `npx vitest run src/trips` зелені
- [ ] `tracker.md`: TRP-2 → `done`

## Notes

<!-- Сюди виконавець пише причину `blocked` і домовленості, що виникли під час роботи. -->
