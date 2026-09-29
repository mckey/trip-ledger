---
id: EXP-5
title: "Репозиторії витрат: мапінг rate_nano ↔ BigInt і rate_set_at, hasRatedExpenses"
epic: multi-currency-summary
project: trip-ledger
bc: expenses
layer: infrastructure
wave: 3
priority: Must
estimate: M
blocks: [X-1, HTTP-1]
blocked_by: [EXP-1, MIG-1]
external_blocked_by: []
status: todo
owner: "Vladimir Makarov"
context_budget: ~2400 tokens
prd_refs: [AC-01, AC-05, AC-07]
sad_refs: ["Critical flow 1", "Critical flow 3"]
data_refs: [data-model.md#expenses-aggregate-root--bc-expenses, data-model.md#indexes]
openapi_ops: [addExpense, setExpenseRate]
adr_refs: [0001, 0002]
files: [src/expenses/domain/Expense.ts, src/expenses/infrastructure/PostgresExpenseRepository.ts, src/expenses/infrastructure/InMemoryExpenseRepository.ts, src/expenses/infrastructure/expenseRow.ts, src/expenses/infrastructure/expenseRow.test.ts]
created: 2026-09-29
---

# EXP-5 · Postgres / in-memory репозиторії витрат

**Epic:** [multi-currency-summary](./_epic.md) · **Wave:** 3 · **Estimate:** M · **Owner:** Vladimir Makarov

## Місце в послідовності

- **Блокується:** EXP-1 (`Expense.rate`, `findById`; вона ж уже стоїть після trip-budget T8 на тому самому `PostgresExpenseRepository.ts`), MIG-1 (колонки в живій схемі). Trip-budget T9 (contract `currency_code`) ребейзиться на цю story — домовленість записана в її Notes.
- **Блокує:** X-1 (адаптер делегує в `hasRatedExpenses`), HTTP-1 (заміна курсу мусить пережити збереження в Postgres, а не лише in-memory).
- **Чому в цій хвилі:** перша хвиля, де є і домен, і схема.

## Why

Курс мусить пережити збереження без жодного проходу через float (ADR-0002): `BIGINT` приходить з `pg` рядком і так само йде в `BigInt`. Тут же — друге нове читання з data-model «Access patterns»: `EXISTS` явних курсів у поїздці (пошук за PK уже зробила EXP-1).

## Linked artifacts (read-only — НЕ вставляти вміст)

- 🗄 Data delta: [data-model · `expenses`](../data-model.md#expenses-aggregate-root--bc-expenses) — колонки й Access patterns; [Indexes](../data-model.md#indexes) — чому `idx_expenses_trip_id` достатньо
- 🌐 Sequence: [sad §6 · Critical flow 1](../sad.md#6-runtime-view) — «зберегти витрату (upsert)»; Critical flow 3 — «знайти витрату», `RatedExpensesPort`
- 🧱 Конвенція: [sad §8](../sad.md#8-crosscutting-concepts) — рядок «Persistence & migrations»: `BIGINT ↔ BigInt` через рядок
- 🔌 API: [openapi.yaml](../contracts/openapi.yaml) — `Expense.rate` — те, що повернеться після round-trip через БД (`addExpense`, `setExpenseRate`)
- 📜 ADR: [ADR-0001](../adr/0001-expenses-rate-snapshot-as-nullable-column-on-expenses.md), [ADR-0002](../adr/0002-shared-rate-as-bigint-scaled-1e9-half-up.md)

## Acceptance criteria (GWT)

- [ ] **AC-e5-1 (AC-01):** Given рядок БД `rate_nano = '912300000'`, `rate_set_at` заданий, when `fromRow`, then `expense.rate.toNano() === 912300000n` і `toString() === '0.912300000'` — без проміжного `Number`.
- [ ] **AC-e5-2 (AC-05):** Given витрата з новим курсом, when `save` двічі з різними курсами, then `findById` повертає лише другий курс і його `rateSetAt`.
- [ ] **AC-e5-3 (AC-07):** Given поїздка з витратою у base currency без явного курсу, when `hasRatedExpenses(tripId)`, then `false`; після `withRate` на будь-якій витраті — `true`.

## Checklist (1 step ≈ 1 commit)

- [ ] Step 1 — `src/expenses/infrastructure/expenseRow.ts`: чисті `toRow`/`fromRow` (винесені з репозиторію), `rate_nano` — рядок ↔ `Rate.fromNano(BigInt(s))`.
- [ ] Step 2 — `src/expenses/domain/Expense.ts`: `ExpenseRepository` + `hasRatedExpenses(tripId): Promise<boolean>` — лише явні курси.
- [ ] Step 3 — `PostgresExpenseRepository.ts`: upsert пише обидві колонки, читання мапить їх через `expenseRow.ts`; `hasRatedExpenses` — `EXISTS … rate_nano IS NOT NULL` по `trip_id`; `InMemoryExpenseRepository.ts` — той самий метод.
- [ ] Step 4 — `expenseRow.test.ts`: AC-e5-1 + крайові рядки (обидва `NULL`, максимальний `BIGINT`); AC-e5-2..3 — на in-memory.
- [ ] Step 5 — Смок проти Postgres з `docker-compose.yml` (після MIG-1): додати, замінити курс, прочитати — вивід у PR.

## Edge cases

| Кейс | Поведінка |
|---|---|
| `pg` віддає `BIGINT` числом (хтось поставив `setTypeParser`) | `fromRow` приймає лише рядок і кидає інакше — тихої втрати точності не буде |
| Рядок з `rate_nano` без `rate_set_at` | Неможливий через CHECK пари (MIG-1); `fromRow` все одно кидає |
| Колонка валюти ще `currency`, не `currency_code` | Читання — як лишив trip-budget T8 (`COALESCE`), ця story валюту не чіпає |

## Definition of Done

- [ ] `expenseRow.test.ts` зелений на AC-e5-1; AC-05 і AC-07 перевірені на `InMemoryExpenseRepository`
- [ ] Смок на docker Postgres пройдено, вивід `psql` у PR (Step 5)
- [ ] `node_modules/.bin/tsc --noEmit`, `npx vitest run src/expenses` зелені
- [ ] `tracker.md`: EXP-5 → `done`

## Notes

<!-- Сюди виконавець пише причину `blocked` і домовленості, що виникли під час роботи. -->
