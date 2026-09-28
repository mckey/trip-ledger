# Data-model audit — trip-budget (2026-09-28)

Skill: `generate-data-model` (sdlc plugin v4.5.1), `--mode brownfield`. Size: S.

## Generated files

- `docs/features/trip-budget/data-model.md` — ER (`erDiagram` перевірено `mermaid@11` `parse()`), 2 таблиці, індекси, план breaking change.
- `docs/features/trip-budget/backfill-currency-code.md` — супутник backfill.
- Staged-міграції (4 пари) у `docs/features/trip-budget/migrations/`:
  - `20260928120000_add_budget_to_trips.{up,down}.sql`
  - `20260928120100_add_currency_code_to_expenses.{up,down}.sql` — breaking 1/3 expand
  - `20260928120200_backfill_currency_code_in_expenses.{up,down}.sql` — breaking 2/3 backfill
  - `20260928120300_contract_currency_on_expenses.{up,down}.sql` — breaking 3/3 contract
- `.claude/rules/migrations.md` — **bootstrapped** з `templates/rules-migrations-baseline.md` (файлу не було). Правити, якщо команда не згодна з дефолтом.

Міграції **staged** — у живе дерево `migrations/` нічого не записано; `implement-tasks` промотує їх, перештампувавши timestamp у момент промоції.

## Convention divergences (course defaults vs репо)

| Тема | Репо зараз | Застосовано | Що вирішити |
|---|---|---|---|
| Імена міграцій | послідовні `0001_`, `0002_`, один файл без down | timestamp-пари `.up.sql` / `.down.sql` | змішування форматів у живому `migrations/` при промоції |
| Раннер | `Makefile`: `npx node-pg-migrate up`, пакета в `package.json` немає | golang-migrate (дефолт скіла, roundtrip через `migrate/migrate:v4.18.3`) | node-pg-migrate не читає пари `.up/.down` — при промоції або міняти раннер, або конвертувати файли |
| `CHECK` | 0001/0002 мають CHECK на enum, `>= 0`, `ends_at >= starts_at` | нових CHECK немає | **конфлікт з Accepted ADR-0001**: там CHECK `budget_minor > 0` і парність budget/base currency обрані свідомо як «друга лінія захисту». Скіл застосовує дефолт і лише фіксує розходження — ADR-0001 треба або поправити, або повернути CHECK руками |
| Рядки | `TEXT` скрізь | `VARCHAR(3)` для `base_currency`, `currency_code` | — |
| PK | `TEXT` + UUID v4 з `randomUUID()` | нових таблиць немає, не чіпаємо | UUID v7 / тип `UUID` — окремим рішенням |
| Audit-колонки | `created_at` немає в жодній таблиці | не додано (PRD не вимагає, нових таблиць немає) | борг відносно course default |
| Business `DEFAULT` | `trips.status DEFAULT 'planned'` | не чіпаємо | legacy |

## Drift findings

**Schema-vs-source** (живі `migrations/0001`, `0002` проти `src/trips/domain/Trip.ts`, `src/expenses/domain/Expense.ts`): розходжень немає — `Trip` (id, title, country, startsAt, endsAt, status) і `Expense` (id, tripId, amount: Money → amount_minor + currency, category, spentAt) 1:1 з колонками. `_drift/` не створено.

Очікуваний drift після промоції: `budget_minor`, `base_currency`, `currency_code` без полів у domain — закривається кодом тих самих PR (див. `data-model.md`, таблиця кроків).

**Model-vs-spec:**
- PRD §4 / ADR-0001: budget і base currency мають колонки — OK. Нових сутностей PRD не вводить.
- SAD §5 описує міграцію як `0003_add_trip_budget.sql` з `INTEGER NULL CHECK (budget_minor > 0)`, `base_currency TEXT` і CHECK парності — data-model відрізняється (без CHECK, `VARCHAR(3)`, timestamp-ім'я). Потрібен back-port у SAD §5/§8.
- `expenses.currency_code` не має origin у PRD — origin у SAD §11 (accepted debt «вирівняти валюту під ISO 4217») і AC-06 (counted = рівність валют).
- Поза фічею: кореневий `CONTEXT.md` перелічує категорії `food, transport, stay, other`, а схема і zod — `transport, lodging, food, tickets, other`. Для `fix-term`.

## Breaking changes decomposed

`expenses.currency TEXT NOT NULL` → `expenses.currency_code VARCHAR(3) NOT NULL` — expand / backfill / contract, 3 окремі PR і деплої, порядок деплою в `data-model.md`.

Додано під час review, у шаблоні скіла цього кроку немає: `ALTER COLUMN currency DROP NOT NULL` уже в кроці expand. Інакше між деплоєм коду кроку 3 (не пише `currency`) і contract-міграцією (видаляє `currency`) кожна вставка падала б на NOT NULL старої колонки.

## Self-check (4/4)

1. **Naming** — 8/8 файлів `<YYYYMMDDhhmmss>_<verb>_<entity>.(up|down).sql`; нових таблиць немає.
2. **down reversibility** — кожен `up` має `down`; кожен `ADD COLUMN` має `DROP COLUMN`, `DROP NOT NULL` ↔ `SET NOT NULL`, backfill ↔ `SET currency_code = NULL`, contract ↔ повернення `currency` з даних `currency_code`. Підтверджено roundtrip (нижче).
3. **FK indexes** — нових `REFERENCES` немає; наявний FK `expenses.trip_id` має `idx_expenses_trip_id`.
4. **Forbidden features** — `grep -E "CHECK \(|CREATE TRIGGER|DEFAULT '"` по staged: 0 збігів (перший прогін дав 1 хибний збіг у коментарі — коментар переформульовано).

## Roundtrip (Postgres 17-alpine, golang-migrate v4.18.3)

`scripts/db-roundtrip.sh docs/features/trip-budget/migrations`:

```
migrate up        4/u applied
migrate down -all 4/d applied
migrate up        4/u applied → version 20260928120300
OK  down == baseline (columns, types, nullability, defaults, constraints, indexes)
OK  up#2 == up#1 (pg_dump -s, byte-for-byte)
OK  data after up#2 == after up#1
ROUNDTRIP OK
```

Нюанси, які roundtrip показав: після down кроку 3 колонка `currency` стоїть у кінці таблиці (порівняння каталогу — без порядку колонок), значення повертаються канонічними (`'eur'` → `EUR`). Негативний сценарій (`currency = 'грн'`) — у `backfill-currency-code.md`.

## TBDs

- `data-model.md` «Test fixtures» — `<!-- TBD: згенерувати на implement-tasks … -->`: поля budget/baseCurrency ще не існують у domain, фабрика не скомпілюється.
