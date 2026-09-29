---
id: T13
title: "Написати наскрізний HTTP-тест сценарію trip-budget з перевіркою латентності підсумку"
layer: "tests"
deps: ["T12"]
acs: ["AC-01", "AC-03", "AC-03b", "AC-04", "AC-05", "AC-06b", "AC-07", "AC-08", "AC-09"]
files_hint: ["src/presentation/tripBudget.e2e.test.ts"]
owner: "Vladimir Makarov"
estimate: "M"
status: "todo"
---

# T13 — Написати наскрізний HTTP-тест сценарію trip-budget з перевіркою латентності підсумку

## Why

Окремі задачі перевіряють свої шари; наскрізний тест доводить, що flows 1–3 і cross-cutting AC-08 з [sad §6](../sad.md) працюють разом через `createApp`. Латентність — [sad §10 QG-2](../sad.md), [PRD §6](../PRD.md). AC: [PRD §5](../PRD.md) (перелік — у `acs`).

## What

- `src/presentation/tripBudget.e2e.test.ts` — supertest поверх `createApp` з in-memory репозиторіями і ключем: створити поїздку → задати budget → додати витрати (одна понад budget, одна чужовалютна) → підсумок → замінити budget → підсумок → finished-поїздка → задати budget → запит без ключа.
- Очікувані тіла — з `src/contracts/trip-budget.fixtures.ts` і типів `src/contracts/trip-budget.gen.ts`.

## Definition of Done

- [ ] Сценарій зелений: budget збережено й підсумок показує блок (AC-01); remaining = budget − Σ counted (AC-03), від'ємний після перевищення (AC-03b); витрату понад budget прийнято з overspend signal (AC-04); після заміни budget витрати не змінились, remaining від нового значення (AC-05, AC-07); поїздка лише з чужовалютними витратами → remaining = повний budget (AC-06b); finished-поїздка приймає budget (AC-09); без ключа → 401 (AC-08).
- [ ] `it('summary with budget block responds under 250 ms for 300 expenses')` зелений ([sad §10 QG-2](../sad.md)).
- [ ] `npx vitest run` зелений, `npx tsc --noEmit` чистий.

## Notes

- k6 smoke у CI з [PRD §6](../PRD.md) «Measurement» тут не робиться: CI в репо немає (`.github/` відсутній) — лишається відкритим пунктом NFR.
- In-memory тест не ганяє Postgres-шлях; міграції й репозиторії перевіряються roundtrip-ом у T3, T7–T9.
