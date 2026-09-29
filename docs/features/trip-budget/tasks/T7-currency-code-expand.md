---
id: T7
title: "Крок 1/3 currency_code: промотувати expand-міграцію і ввімкнути dual-write у PostgresExpenseRepository"
layer: "migration"
deps: ["T3"]
acs: ["AC-06"]
files_hint: ["docs/features/trip-budget/migrations/20260928120100_add_currency_code_to_expenses.up.sql", "docs/features/trip-budget/migrations/20260928120100_add_currency_code_to_expenses.down.sql", "src/expenses/infrastructure/PostgresExpenseRepository.ts"]
owner: "Vladimir Makarov"
estimate: "M"
status: "todo"
---

# T7 — Крок 1/3 currency_code: промотувати expand-міграцію і ввімкнути dual-write у PostgresExpenseRepository

## Why

Counted expense = валюта витрати дорівнює base currency ([PRD §AC-06](../PRD.md)); без нормалізованого `currency_code` написання `'eur'` чи `' EUR '` мовчки стають uncounted. Breaking change `expenses.currency` → `currency_code` іде трьома PR — [data-model.md](../data-model.md) §«Breaking change», крок 1 (expand).

## What

- Staged-пара [`../migrations/20260928120100_add_currency_code_to_expenses.up.sql`](../migrations/20260928120100_add_currency_code_to_expenses.up.sql) + `.down.sql`.
- `src/expenses/infrastructure/PostgresExpenseRepository.ts` — `save()` пише обидві колонки (`currency` як ввели, `currency_code` нормалізовано), читання — зі старої `currency`. Порядок деплою: міграція → код.

## Definition of Done

- [ ] Staged-міграція промотована в живий `migrations/`, застосовується і відкочується чисто (`scripts/db-roundtrip.sh docs/features/trip-budget/migrations`).
- [ ] Після up: нова витрата з валютою `' eur '` зберігає `currency = ' eur '` і `currency_code = 'EUR'`; читання повертає ту саму `Money`, що й до зміни.
- [ ] `npx tsc --noEmit` чистий, `npx vitest run` зелений.

## Notes

- Lane `migration` + спільний `files_hint` (`PostgresExpenseRepository.ts`) з T8/T9 — серіалізовано, три окремі PR і три деплої ([data-model.md](../data-model.md)).
- Формат промоції golang-migrate → node-pg-migrate — як у T3.
- Паралельна гілка відносно T4–T6/T10–T13: доменна логіка й HTTP від кроку міграції не залежать ([api-sync-report](../contracts/api-sync-report.md), check 4, нотатка).
