---
id: E2E-1
title: "HTTP-сценарій мультивалютної поїздки від створення до дозаповнення курсів"
epic: multi-currency-summary
project: trip-ledger
bc: http
layer: e2e
wave: 6
priority: Must
estimate: M
blocks: []
blocked_by: [HTTP-2, HTTP-3]
external_blocked_by: []
status: todo
owner: "Vladimir Makarov"
context_budget: ~2400 tokens
prd_refs: [AC-01, AC-04, AC-05, AC-07, AC-08, AC-09]
sad_refs: ["Critical flow 1", "Critical flow 2", "Critical flow 3"]
data_refs: ["none: in-memory репозиторії; Postgres-шлях — смок EXP-5"]
openapi_ops: [createTrip, setTripBaseCurrency, addExpense, setExpenseRate, getTripSummary]
adr_refs: ["0003", "0004"]
files: [src/presentation/multiCurrency.e2e.test.ts]
created: 2026-09-29
---

# E2E-1 · Мультивалютна поїздка наскрізь

**Epic:** [multi-currency-summary](./_epic.md) · **Wave:** 6 · **Estimate:** M · **Owner:** Vladimir Makarov

## Місце в послідовності

- **Блокується:** HTTP-2, HTTP-3 (усі п'ять операцій уже на дроті).
- **Блокує:** нічого — закриває епік.
- **Чому в цій хвилі:** єдина story, що бачить обидва BC через HTTP.

## Why

Юніт- і HTTP-тести перевіряють кожну гілку окремо; тут — що вони складаються в сценарій серпневої поїздки: частина витрат без курсу, курси дозаповнено після завершення, залишок перестає брехати. Латентність (QG-2) міряє HTTP-3 у `expenses.http.test.ts`, як у SAD.

## Linked artifacts (read-only — НЕ вставляти вміст)

- 🌐 Sequence: [sad §6](../sad.md#6-runtime-view) — Critical flow 1, 2, 3 у порядку сценарію
- 📐 Якість: [sad §10 · QG-3](../sad.md#10-quality-requirements) — витрати не мутуються перерахунком
- 🔌 API: [openapi.yaml](../contracts/openapi.yaml) — `createTrip`, `setTripBaseCurrency`, `addExpense`, `setExpenseRate`, `getTripSummary`
- 🧭 Domain: [CONTEXT · Invariants](../CONTEXT.md#invariants) — кожен інваріант має тут крок
- 📋 PRD: [§5](../PRD.md#5-acceptance-criteria), [§6 NFR](../PRD.md#6-non-functional-requirements)
- 🗄 Data delta: none — in-memory

## Acceptance criteria (GWT)

- [ ] **AC-e2e-1 (AC-01, AC-09):** Given поїздка з base currency `EUR` і budget 1000 EUR, when додати CZK-витрату з курсом, then у підсумку вона і в `converted.total`, і в `budget.remaining`.
- [ ] **AC-e2e-2 (AC-04, AC-08):** Given ще USD-витрата без курсу і поїздка переведена у finished (сидом у репозиторії — `FinishTrip` не змонтований), when задати курс на USD-витрату, then 200, `withoutRate` зменшився на 1.
- [ ] **AC-e2e-3 (AC-07):** Given ці явні курси, when змінити base currency, then 409 `trips.base_currency_locked`, підсумок не змінився.
- [ ] **AC-e2e-4 (AC-05):** Given заміна курсу CZK-витрати, when прочитати підсумок, then total перераховано від нового курсу.

## Checklist (1 step ≈ 1 commit)

- [ ] Step 1 — `src/presentation/multiCurrency.e2e.test.ts`: `createApp` з in-memory репозиторіями і тестовим API key; хелпери запитів з gen-типами.
- [ ] Step 2 — Сценарій AC-e2e-1..4 одним `describe`, кроки послідовно, стан між кроками — через HTTP, не через репозиторій (крім сиду finished).
- [ ] Step 3 — Інваріант QG-3: після всіх кроків збережені витрати мають ту саму суму й валюту, що при введенні.

## Edge cases

| Кейс | Поведінка |
|---|---|
| Сид finished замість виклику `FinishTrip` | Свідомо: use case не змонтований у роутер (brownfield), монтувати — поза скоупом фічі |
| k6 smoke з PRD §6 | CI немає (trip-budget T13 зафіксував) — латентність лише в HTTP-3 |

## Definition of Done

- [ ] `multiCurrency.e2e.test.ts` зелений: AC-01, AC-04, AC-05, AC-07, AC-08, AC-09 пройдені одним сценарієм
- [ ] Після сценарію жодна збережена витрата не змінила суму й валюту введення (QG-3)
- [ ] `node_modules/.bin/tsc --noEmit`, `npx vitest run` зелені повністю
- [ ] `tracker.md`: E2E-1 → `done`; епік закрито в `_epic.md`

## Notes

<!-- Сюди виконавець пише причину `blocked` і домовленості, що виникли під час роботи. -->
