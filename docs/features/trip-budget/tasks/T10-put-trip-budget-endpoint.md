---
id: T10
title: "Додати маршрут PUT /trips/{trip_id}/budget і презентер Trip у tripsRouter"
layer: "ports"
deps: ["T0", "T4"]
acs: ["AC-01", "AC-02", "AC-07", "AC-09"]
files_hint: ["src/trips/presentation/tripsRouter.ts", "src/trips/presentation/trips.http.test.ts", "src/trips/presentation/tripPresenter.ts", "src/presentation/http.ts"]
owner: "Vladimir Makarov"
estimate: "M"
status: "todo"
---

# T10 — Додати маршрут PUT /trips/{trip_id}/budget і презентер Trip у tripsRouter

## Why

Операція `setTripBudget` у [openapi.yaml](../contracts/openapi.yaml) — вхід owner-а до flow 1 ([sad §6](../sad.md)). AC: [PRD §AC-01](../PRD.md), [PRD §AC-02](../PRD.md), [PRD §AC-07](../PRD.md), [PRD §AC-09](../PRD.md).

## What

- `src/trips/presentation/tripsRouter.ts` — маршрут `PUT /trips/:id/budget`: zod-схема за `SetBudgetRequest`, виклик `SetTripBudget` (T4), відповідь `200` за `TripBudget`; мапінг `TripDoesNotExistError` → 404 `trip.not_found`, `BudgetCurrencyMismatchError` → 422 `budget.currency_mismatch`, zod → 422 `validation.invalid_payload` (коди — [api-sync-report §Error codes](../contracts/api-sync-report.md)).
- `src/trips/presentation/tripPresenter.ts` — явна серіалізація `Trip`, щоб нові поля не протекли в `GET /trips/:id` ([api-sync-report F6](../contracts/api-sync-report.md)).
- `src/presentation/http.ts` — спільні для двох роутерів: тіло помилки `{ code, message, details? }` і zod-константа коду валюти (`^[A-Z]{3}$`, [sad §8](../sad.md) «Validation»; одна константа на два роутери — [sad §11](../sad.md)).
- `src/trips/presentation/trips.http.test.ts` — supertest поверх `createApp` з in-memory репозиторіями.

## Definition of Done

- [ ] HTTP-тести зелені: `PUT` з валідним тілом → 200 і тіло за `TripBudget` (AC-01); нуль / від'ємна сума / чужа валюта → 422 з поясненням (AC-02); повторний `PUT` → 200 з новим значенням (AC-07); `PUT` на finished-поїздку → 200 (AC-09); невідома поїздка → 404.
- [ ] `GET /trips/:id` віддає ту саму форму, що й до фічі (тест-регресія на F6).
- [ ] Очікувані тіла типізовані `src/contracts/trip-budget.gen.ts` / взяті з `trip-budget.fixtures.ts`; `npx tsc --noEmit` чистий.

## Notes

- **Передумова — рішення F2** ([api-sync-report](../contracts/api-sync-report.md)): контракт — snake_case, `/api/v1`, `{code, message}`; живий код — camelCase, без префікса, `{error}` / `{errors}`. До рішення цю задачу не стартувати.
- `src/presentation/http.ts` спільний з T11 — T11 іде після T10 (спільний lane).
- AC-09 через HTTP перевіряється finished-поїздкою, засіяною в репозиторій (`FinishTrip` не змонтований — [sad §11](../sad.md)).
- `src/contracts/*.gen.ts` не правити руками — лише `node scripts/contracts.mjs gen trip-budget`.
