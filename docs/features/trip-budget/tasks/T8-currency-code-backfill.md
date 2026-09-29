---
id: T8
title: "Крок 2/3 currency_code: промотувати backfill-міграцію і читати COALESCE(currency_code, currency)"
layer: "migration"
deps: ["T7"]
acs: ["AC-06"]
files_hint: ["docs/features/trip-budget/migrations/20260928120200_backfill_currency_code_in_expenses.up.sql", "docs/features/trip-budget/migrations/20260928120200_backfill_currency_code_in_expenses.down.sql", "src/expenses/infrastructure/PostgresExpenseRepository.ts"]
owner: "Vladimir Makarov"
estimate: "S"
status: "todo"
---

# T8 — Крок 2/3 currency_code: промотувати backfill-міграцію і читати COALESCE(currency_code, currency)

## Why

Старі витрати мають отримати нормалізований `currency_code`, інакше AC-06 рахує їх неправильно ([PRD §AC-06](../PRD.md)). Крок 2 (backfill) — [data-model.md](../data-model.md) §«Breaking change», супутник — [backfill-currency-code.md](../backfill-currency-code.md).

## What

- Staged-пара [`../migrations/20260928120200_backfill_currency_code_in_expenses.up.sql`](../migrations/20260928120200_backfill_currency_code_in_expenses.up.sql) + `.down.sql`.
- `src/expenses/infrastructure/PostgresExpenseRepository.ts` — читання через `COALESCE(currency_code, currency)`, запис — як у T7 (обидві колонки). Порядок деплою: міграція → код.

## Definition of Done

- [ ] Staged-міграція промотована в живий `migrations/`, застосовується і відкочується чисто (`scripts/db-roundtrip.sh docs/features/trip-budget/migrations`); повторний up не змінює вже заповнених рядків.
- [ ] Сид з `'EUR'`, `'eur'`, `' uah '`, `'грн'` після up: перші три мають `currency_code`, `'грн'` лишається `NULL` і читається через `COALESCE` без помилки.
- [ ] `npx tsc --noEmit` чистий, `npx vitest run` зелений.

## Notes

- **Раннер.** Файл — один `DO $$ … COMMIT … $$` без транзакції (розраховано на golang-migrate). node-pg-migrate за замовчуванням `--single-transaction`; за [.claude/rules/migrations.md](../../../../.claude/rules/migrations.md) такий backfill промотується як `.js` з `pgm.noTransaction()`. Промоція тут — переписування, не копіювання.
- Перед деплоєм — `SELECT DISTINCT currency FROM expenses` і ручний розбір неоднозначних значень ([backfill-currency-code.md](../backfill-currency-code.md)).
