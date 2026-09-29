---
id: T9
title: "Крок 3/3 currency_code: перевести PostgresExpenseRepository лише на currency_code і промотувати contract-міграцію"
layer: "migration"
deps: ["T8"]
acs: ["AC-06"]
files_hint: ["docs/features/trip-budget/migrations/20260928120300_contract_currency_on_expenses.up.sql", "docs/features/trip-budget/migrations/20260928120300_contract_currency_on_expenses.down.sql", "src/expenses/infrastructure/PostgresExpenseRepository.ts"]
owner: "Vladimir Makarov"
estimate: "S"
status: "todo"
---

# T9 — Крок 3/3 currency_code: перевести PostgresExpenseRepository лише на currency_code і промотувати contract-міграцію

## Why

Завершення breaking change — `currency_code NOT NULL`, стара колонка видаляється; після цього counted/uncounted ([PRD §AC-06](../PRD.md)) визначаються лише канонічним кодом. Крок 3 (contract) — [data-model.md](../data-model.md) §«Breaking change».

## What

- `src/expenses/infrastructure/PostgresExpenseRepository.ts` — `ExpenseRow` без `currency`; запис і читання лише `currency_code`.
- Staged-пара [`../migrations/20260928120300_contract_currency_on_expenses.up.sql`](../migrations/20260928120300_contract_currency_on_expenses.up.sql) + `.down.sql`. **Порядок деплою зворотний: код → міграція** (post-deploy).

## Definition of Done

- [ ] Передумова перевірена: `SELECT count(*) FROM expenses WHERE currency_code IS NULL` = 0.
- [ ] Staged-міграція промотована в живий `migrations/`, застосовується і відкочується чисто (`scripts/db-roundtrip.sh docs/features/trip-budget/migrations`).
- [ ] Після up: у `expenses` немає колонки `currency`, `currency_code` NOT NULL; збереження і читання витрати працюють.
- [ ] `npx tsc --noEmit` чистий, `npx vitest run` зелений.

## Notes

- **Lane з multi-currency-summary:** `PostgresExpenseRepository.ts` після T8 правлять mcs EXP-1 і EXP-5; T9 ребейзиться на них (у їхніх story це записано). Між епіками E8 цього не бачить — домовленість тут.
- Якщо contract упав на NULL-рядках — сценарій відновлення в [backfill-currency-code.md](../backfill-currency-code.md) §«Якщо contract уже впав» (команди там — для golang-migrate; для node-pg-migrate їх треба переписати).
- Після кроку 3 сирі написання валюти втрачено назавжди — свідомий `[DECISION]` у [data-model.md](../data-model.md).
