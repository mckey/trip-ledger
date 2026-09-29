---
id: HTTP-2
title: "tripsRouter: baseCurrency у створенні, маршрут зміни base currency, зшивання RatedExpensesPort в app.ts"
epic: multi-currency-summary
project: trip-ledger
bc: http
layer: wiring
wave: 5
priority: Must
estimate: M
blocks: [E2E-1]
blocked_by: [TRP-2, X-1]
external_blocked_by: ["trip-budget:T12"]
status: todo
owner: "Vladimir Makarov"
context_budget: ~2400 tokens
prd_refs: [AC-06, AC-07]
sad_refs: ["Critical flow 3"]
data_refs: ["none: HTTP-шар і зшивання; колонка base_currency — з trip-budget"]
openapi_ops: [createTrip, setTripBaseCurrency]
adr_refs: [0004]
files: [src/trips/presentation/tripsRouter.ts, src/trips/presentation/tripPresenter.ts, src/trips/presentation/trips.http.test.ts, src/presentation/app.ts]
created: 2026-09-29
---

# HTTP-2 · Маршрути base currency і зшивання зворотного порту

**Epic:** [multi-currency-summary](./_epic.md) · **Wave:** 5 · **Estimate:** M · **Owner:** Vladimir Makarov

## Місце в послідовності

- **Блокується:** TRP-2 (use cases), X-1 (адаптер); зовнішньо — trip-budget T12 (`createApp` з API-key і `TripRepositoryBudgetPort`; T10 до неї вже змінив `tripsRouter.ts`).
- **Блокує:** E2E-1.
- **Чому в цій хвилі:** за X-1 (W4); з HTTP-3 паралельно — інші файли.

## Why

Base currency задається при створенні поїздки або окремо (AC-06 потребує її і без budget), зміна блокується явними курсами (AC-07). `app.ts` — єдине місце, де обидва напрямки портів зшиваються (ADR-0004).

## Linked artifacts (read-only — НЕ вставляти вміст)

- 🔌 API: [openapi.yaml](../contracts/openapi.yaml) — `createTrip` (`CreateTripRequest.baseCurrency`), `setTripBaseCurrency` (`SetBaseCurrencyRequest`, 409 `trips.base_currency_locked`)
- 🧭 Коди: [CONTEXT · Sentinel errors](../CONTEXT.md#sentinel-errors) — `BaseCurrencyLockedError`, `TripDoesNotExistError`; [Scope-filter invariant](../CONTEXT.md#scope-filter-invariant) — зшивання лише в `app.ts`
- 🌐 Sequence: [sad §6 · Critical flow 3](../sad.md#6-runtime-view) — друга частина
- 🧱 Building blocks: [sad §5](../sad.md#5-building-block-view) — рядки `tripsRouter.ts ~`, `presentation/app.ts ~`
- 📊 Звіт: [api-sync-report · Error codes](../contracts/api-sync-report.md#error-codes)
- 📜 ADR: [ADR-0004](../adr/0004-cross-base-currency-standalone-locked-via-rated-expenses-port.md)

## Acceptance criteria (GWT)

- [ ] **AC-h2-1 (AC-06):** Given тіло створення поїздки з `baseCurrency: "EUR"`, when створити поїздку, then 201 і `trip.baseCurrency === "EUR"`, `budget` відсутній.
- [ ] **AC-h2-2 (AC-07):** Given поїздка з `EUR` і витрата з явним курсом, засіяна прямо в in-memory репозиторій, when змінити base currency на `PLN`, then 409 `trips.base_currency_locked`.
- [ ] **AC-h2-3 (AC-07):** Given поїздка з `EUR` лише з витратами у `EUR`, when змінити base currency, then 200 і нова валюта.
- [ ] **AC-h2-4 (AC-06):** Given `baseCurrency: "eur"`, when створити поїздку, then 422 `http.validation_failed`.
- [ ] **AC-h2-5 (AC-06):** Given тіло створення без `baseCurrency`, when створити поїздку, then у відповіді `baseCurrency: null` — поле є завжди (api-sync-report F4).

## Checklist (1 step ≈ 1 commit)

- [ ] Step 1 — `src/trips/presentation/tripsRouter.ts`: необов'язкова `baseCurrency` у схемі створення (ISO 4217 `^[A-Z]{3}$`).
- [ ] Step 2 — Маршрут зміни base currency (шлях — з контракту); мапінг `BaseCurrencyLockedError` → 409, `TripDoesNotExistError` → 404.
- [ ] Step 3 — `src/trips/presentation/tripPresenter.ts` (з trip-budget T10): + `baseCurrency`, `undefined → null`.
- [ ] Step 4 — `src/presentation/app.ts`: `new ExpenseRepositoryRatedPort(deps.expenses)` → `tripsRouter(...)`, поруч із наявними `TripRepositoryStatusPort`/`TripRepositoryBudgetPort`.
- [ ] Step 5 — `src/trips/presentation/trips.http.test.ts`: AC-h2-1..5 через `createApp` з in-memory репозиторіями.

## Edge cases

| Кейс | Поведінка |
|---|---|
| Зміна base currency при заданому budget | Дозволено (SAD), попередження — у `description` операції; відкрите питання F8 — у `_generation.md` |
| Без API key | 401 до будь-якої логіки — з trip-budget T12, тут лише не зламати |

## Definition of Done

- [ ] `trips.http.test.ts` зелений на AC-h2-1..5 (AC-06, AC-07)
- [ ] У `app.ts` зшиті обидва напрямки портів; інших місць, де trips отримує expenses, немає (grep у PR)
- [ ] `node scripts/contracts.mjs lint multi-currency-summary` — 0 problems; `node_modules/.bin/tsc --noEmit`, `npx vitest run src` зелені
- [ ] `tracker.md`: HTTP-2 → `done`

## Notes

<!-- Сюди виконавець пише причину `blocked` і домовленості, що виникли під час роботи. -->
