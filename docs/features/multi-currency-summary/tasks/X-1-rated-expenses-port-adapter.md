---
id: X-1
title: "Адаптер ExpenseRepositoryRatedPort у trips/infrastructure — зворотний порт trips → expenses"
epic: multi-currency-summary
project: trip-ledger
bc: cross
layer: infrastructure
wave: 4
priority: Must
estimate: S
blocks: [HTTP-2]
blocked_by: [TRP-1, EXP-5]
external_blocked_by: []
status: todo
owner: "Vladimir Makarov"
context_budget: ~2000 tokens
prd_refs: [AC-07]
sad_refs: ["Critical flow 3"]
data_refs: [data-model.md#expenses-aggregate-root--bc-expenses]
openapi_ops: [setTripBaseCurrency]
adr_refs: [0004]
files: [src/trips/infrastructure/ExpenseRepositoryRatedPort.ts, src/trips/infrastructure/ExpenseRepositoryRatedPort.test.ts]
created: 2026-09-29
---

# X-1 · `ExpenseRepositoryRatedPort`

**Epic:** [multi-currency-summary](./_epic.md) · **Wave:** 4 · **Estimate:** S · **Owner:** Vladimir Makarov

## Місце в послідовності

- **Блокується:** TRP-1 (інтерфейс `RatedExpensesPort`), EXP-5 (`ExpenseRepository.hasRatedExpenses` і його реалізації).
- **Блокує:** HTTP-2 (зшивання в `app.ts`).
- **Чому в цій хвилі:** потребує обох сторін — порту trips і методу репозиторію expenses.

## Why

Перший двонапрямний зв'язок між BC у репо (ADR-0004). Адаптер — єдине місце, де trips «бачить» expenses, — дзеркало наявного `TripRepositoryStatusPort` в іншому напрямку. `bc: cross`, бо файл живе в trips, а імпортує domain expenses.

## Linked artifacts (read-only — НЕ вставляти вміст)

- 🧭 Domain: [CONTEXT · Scope-filter invariant](../CONTEXT.md#scope-filter-invariant) — «чужий BC лише через порт», «читання обмежене поїздкою»
- 🌐 Sequence: [sad §6 · Critical flow 3](../sad.md#6-runtime-view) — «є витрати з ЯВНИМ rate snapshot? (RatedExpensesPort …)»
- 🧱 Building blocks: [sad §5](../sad.md#5-building-block-view) — рядок `trips/infrastructure/ExpenseRepositoryRatedPort.ts +`; [sad §8](../sad.md#8-crosscutting-concepts) — «Cross-BC access»
- 🗄 Data delta: [data-model · `expenses`](../data-model.md#expenses-aggregate-root--bc-expenses) — Access pattern `EXISTS … rate_nano IS NOT NULL`
- 🔌 API: [openapi.yaml](../contracts/openapi.yaml) — через цей порт відповідає `setTripBaseCurrency` (409 `trips.base_currency_locked`)
- 📜 ADR: [ADR-0004](../adr/0004-cross-base-currency-standalone-locked-via-rated-expenses-port.md)
- 🪞 Зразок: `src/expenses/infrastructure/TripRepositoryStatusPort.ts` (наявний файл)

## Acceptance criteria (GWT)

- [ ] **AC-x1-1 (AC-07):** Given фейковий `ExpenseRepository`, що повертає `true` для поїздки A, when `port.hasRatedExpenses('A')`, then `true`, і виклик пішов саме з `tripId = 'A'`.
- [ ] **AC-x1-2 (AC-07):** Given той самий фейк, when `port.hasRatedExpenses('B')`, then `false` — дані поїздки A не протікають.

## Checklist (1 step ≈ 1 commit)

- [ ] Step 1 — `src/trips/infrastructure/ExpenseRepositoryRatedPort.ts`: `implements RatedExpensesPort`, конструктор приймає `ExpenseRepository`, коментар-шапка як у `TripRepositoryStatusPort`.
- [ ] Step 2 — Делегування в `hasRatedExpenses(tripId)` без власної логіки (правило «явний, не похідний» — у репозиторії, EXP-5).
- [ ] Step 3 — `ExpenseRepositoryRatedPort.test.ts`: AC-x1-1..2 на фейку.

## Edge cases

| Кейс | Поведінка |
|---|---|
| Спокуса імпортувати `Expense` у `trips/domain` | Заборонено — лише в `infrastructure/`; dependency-guard ловить domain/application |
| Репозиторій кидає | Помилка йде вгору, `SetTripBaseCurrency` не «відкриває» лок |

## Definition of Done

- [ ] `ExpenseRepositoryRatedPort.test.ts` зелений на AC-x1-1..2 (AC-07)
- [ ] Імпорт з `src/expenses/` є лише в `src/trips/infrastructure/ExpenseRepositoryRatedPort.ts` — `grep -rn "expenses/" src/trips` у PR
- [ ] `node_modules/.bin/tsc --noEmit`, `npx vitest run src/trips` зелені
- [ ] `tracker.md`: X-1 → `done`

## Notes

<!-- Сюди виконавець пише причину `blocked` і домовленості, що виникли під час роботи. -->
