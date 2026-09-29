---
id: TRP-1
title: "Trip.setBaseCurrency з локом через RatedExpensesPort + BaseCurrencyLockedError"
epic: multi-currency-summary
project: trip-ledger
bc: trips
layer: domain
wave: 1
priority: Must
estimate: M
blocks: [TRP-2, X-1]
blocked_by: []
external_blocked_by: ["trip-budget:T2"]
status: done
owner: "Vladimir Makarov"
context_budget: ~2400 tokens
prd_refs: [AC-06, AC-07]
sad_refs: ["Critical flow 3"]
data_refs: [data-model.md#trips-aggregate-root--bc-trips]
openapi_ops: [setTripBaseCurrency]
adr_refs: ["0004"]
files: [src/trips/domain/Trip.ts, src/trips/domain/errors.ts, src/trips/domain/Trip.test.ts]
created: 2026-09-29
---

# TRP-1 · `Trip.setBaseCurrency` і лок base currency

**Epic:** [multi-currency-summary](./_epic.md) · **Wave:** 1 · **Estimate:** M · **Owner:** Vladimir Makarov

## Місце в послідовності

- **Блокується:** зовнішньо — trip-budget T2, що додає `Trip.baseCurrency`/`budget` і `TripDoesNotExistError` (без неї поля немає куди класти).
- **Блокує:** TRP-2 (use case), X-1 (адаптер реалізує порт, оголошений тут).
- **Чому в цій хвилі:** усередині епіку блокерів немає — чистий domain BC trips.

## Why

У trip-budget base currency з'являлась лише разом із budget; тут вона стає самостійним атрибутом поїздки, а зміна вже заданої блокується явними курсами (AC-07). Правило живе в сутності, а факт «є курси?» приходить портом — trips не імпортує expenses.

## Linked artifacts (read-only — НЕ вставляти вміст)

- 🧭 Domain: [CONTEXT · Glossary](../CONTEXT.md#glossary) — base currency, base currency lock; [Invariants](../CONTEXT.md#invariants) — «перше задання завжди», лок лише явними курсами
- 🌐 Sequence: [sad §6 · Critical flow 3](../sad.md#6-runtime-view) — друга частина, гілки `alt є хоча б одна` / `else немає`
- 🧱 Building blocks: [sad §5](../sad.md#5-building-block-view) — рядок `trips/domain/Trip.ts ~` у дельті файлів
- 🗄 Data delta: [data-model · `trips`](../data-model.md#trips-aggregate-root--bc-trips) — `base_currency` без budget дозволена CHECK-ом
- 🔌 API: [openapi.yaml](../contracts/openapi.yaml) — `setTripBaseCurrency`; помилка `trips.base_currency_locked` ([Sentinel errors](../CONTEXT.md#sentinel-errors))
- 📜 ADR: [ADR-0004](../adr/0004-cross-base-currency-standalone-locked-via-rated-expenses-port.md) — семантика локу і напрямок порту
- 📋 PRD: [AC-07](../PRD.md#ac-07--domain-invariant-незмінна-base-currency), [AC-06](../PRD.md#ac-06-us-05--авто-курс-для-base-currency)

## Acceptance criteria (GWT)

- [ ] **AC-t1-1 (AC-07):** Given поїздка без base currency, when `trip.setBaseCurrency('EUR', true)`, then валюта задана — перше задання порт не зупиняє.
- [ ] **AC-t1-2 (AC-07):** Given поїздка з base currency `EUR`, when `trip.setBaseCurrency('PLN', true)`, then кидається `BaseCurrencyLockedError`, валюта лишається `EUR`.
- [ ] **AC-t1-3 (AC-07):** Given поїздка з `EUR` і лише витратами з похідним курсом 1, when `setBaseCurrency('PLN', false)`, then валюта змінена.
- [ ] **AC-t1-4 (AC-06):** Given поїздка без budget, when `setBaseCurrency('EUR', false)`, then base currency задана, а budget лишається відсутнім — валюта живе і без бюджету.
- [ ] **AC-t1-5 (AC-07):** Given поїздка з `EUR` і явними курсами, when `setBaseCurrency('EUR', true)`, then no-op без помилки — це не зміна.

## Checklist (1 step ≈ 1 commit)

- [ ] Step 1 — `src/trips/domain/errors.ts`: `BaseCurrencyLockedError` (ім'я класу → code `trips.base_currency_locked`, не перейменовувати).
- [ ] Step 2 — `src/trips/domain/Trip.ts`: інтерфейс `RatedExpensesPort { hasRatedExpenses(tripId): Promise<boolean> }` (ім'я — з ADR-0004) поряд з `TripRepository`.
- [ ] Step 3 — `Trip.setBaseCurrency(currency, hasRatedExpenses: boolean)` — булеве значення, не порт: сутність синхронна, питання порту ставить use case (TRP-2).
- [ ] Step 4 — `setBudget` з trip-budget фіксує валюту через `setBaseCurrency`, якщо її ще немає, — одна точка правила.
- [ ] Step 5 — `src/trips/domain/Trip.test.ts`: AC-t1-1..5; формат валюти (`^[A-Z]{3}$`) перевіряє zod у HTTP-2, не сутність.

## Edge cases

| Кейс | Поведінка |
|---|---|
| Поїздка finished | Лок не залежить від статусу; зміна валюти finished-поїздки підкоряється тому ж правилу |
| Budget задано, base currency змінюють без курсів | За SAD і контрактом — дозволено, сума budget лишається числом у новій валюті (50 000 EUR → 50 000 CZK). Відкрите питання F8 з api-sync-report: Amendment ADR-0004 «лок і поки задано budget»; до рішення реалізуємо як у SAD, питання — у _generation.md |

## Definition of Done

- [ ] `Trip.test.ts` зелений на AC-t1-1..5; AC-07 покрито всіма гілками, AC-06 — base currency без budget
- [ ] `src/trips/domain/` не імпортує нічого з `src/expenses/` — dependency-guard мовчить
- [ ] `node_modules/.bin/tsc --noEmit`, `npx vitest run src/trips` зелені
- [ ] `tracker.md`: TRP-1 → `done`

## Notes

<!-- Сюди виконавець пише причину `blocked` і домовленості, що виникли під час роботи. -->
