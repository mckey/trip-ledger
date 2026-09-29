# Data-model audit — multi-currency-summary (2026-09-28)

Skill: `schema-forge` (`.claude/skills/schema-forge`, форк `sdlc:generate-data-model`). Size: S.

## Generated files

- `docs/features/multi-currency-summary/data-model.md` — ER (`mermaid@11` `parse()` OK), рішення ADR ↔ rules, CHECK-класи, індекси з відхиленими, мапінг domain → колонки, порядок промоції.
- Staged (node-pg-migrate, `.sql` з up/down-секціями) у `docs/features/multi-currency-summary/migrations/`:
  - `20260928140000000_add_rate_snapshot_to_expenses.sql`
  - `20260928140100000_add_budget_checks_to_trips.sql`
- `docs/features/multi-currency-summary/check-probes.sql` — 6 негативних проб.
- `.claude/rules/migrations.md` — **замінено** baseline-ом schema-forge (крок 2: файл мав маркер bootstrap від `generate-data-model`; рішення — Replace). Staged-файли trip-budget згенеровані під старі правила: формат golang-migrate, без CHECK — перелічено в `data-model.md` §Promotion order.

## Раннер

`Makefile: npx node-pg-migrate up` → `node-pg-migrate` 8.0.4 у devDependencies. Транзакційна модель перевірена на Postgres 17:
- `--single-transaction` за замовчуванням; `.sql` з `CREATE INDEX CONCURRENTLY` → `error: CREATE INDEX CONCURRENTLY cannot run inside a transaction block`;
- шаблон `templates/migration-notx.js` (`pgm.noTransaction()`, CommonJS, бо в `package.json` немає `"type": "module"`) — up створює індекс, down видаляє;
- legacy `0001`/`0002` без маркерів раннер читає як up-only.

## Mermaid-gate

§6 `sad.md` — 5/5 блоків парсяться (після `04: sequences for multi-currency-summary via complete-sequence-diagrams`, де виправлено 9 рядків з `;`).

## ADR ↔ rules

4 рішення, див. `data-model.md` §«Рішення ADR ↔ rules»: 2 × Keep ADR (mcs 0001/0002, mcs 0004), 1 × Amend ADR (trip-budget 0001: `budget_minor > 0` → у БД `>= 0`, `> 0` лишається в домені — **потрібен back-port у trip-budget ADR-0001 / SAD §5**), 1 × CHECK за правилом скіла (пара `rate_nano` / `rate_set_at`).

## Drift

**Schema-vs-source:** real drift — 0. Expected-staged — 6 полів (`Expense.rate`, `rateSetAt`, `amount.currency` → `currency_code`; `Trip.budget`, `baseCurrency`) — чекліст для implement, `_drift/` не створено.

**Model-vs-spec:**
- PRD §9: «одне nullable-поле» + «backfill курсу 1» — data-model має дві колонки і без backfill (ADR-0001, ADR-0003). Розходження вже в SAD §11; back-port у PRD §9 відкритий.
- SAD §5/§8 називають файл `0004_add_expense_rate.sql` з inline CHECK; staged-файл має utc-префікс node-pg-migrate та іменовані CHECK.
- SAD §5/§6 і ADR-0001 кажуть `expenses.currency` / «валюта введення»; після trip-budget contract колонка — `currency_code`. Оновити SAD при реалізації.
- Кореневий `CONTEXT.md`: категорії `food, transport, stay, other` ≠ схема/zod `transport, lodging, food, tickets, other` (знайдено ще на trip-budget) — `fix-term`.

## Індекси

Нових немає; 2 кандидати відхилено з оцінкою рядків (partial по `rate_nano`, `rate_set_at`) — `data-model.md` §Indexes.

## Self-check (5/5)

1. **Naming** — 2/2 `<YYYYMMDDhhmmssSSS>_<verb>_<entity>.sql`.
2. **up/down-симетрія** — кожен `ADD COLUMN` / `ADD CONSTRAINT` з up має `DROP … IF EXISTS` у down (4 + 2 об'єкти).
3. **FK-індекси** — нових `REFERENCES` немає.
4. **Заборонені фічі** (не-коментарні рядки) — `CREATE TRIGGER`, `DEFAULT '`, `CONCURRENTLY` у `.sql`, enum `IN (` — 0; кожен з 4 CHECK класифікований у `data-model.md`.
5. **Roundtrip** — `scripts/db-roundtrip.sh docs/features/multi-currency-summary/migrations --after docs/features/trip-budget/migrations --probes docs/features/multi-currency-summary/check-probes.sql`:

```
runner: node-pg-migrate, staged: 2, baseline: 0001 + 0002 + seed + trip-budget up (4)
migrate up            2 UP     runner table: 2 applied
probes                6/6 rejected, кожна саме своїм CHECK (`-- expect:`): rate_nano_positive ×2, rate_snapshot_pair ×2, budget_has_currency, budget_minor_nonneg
migrate down          2 DOWN   runner table: 0 applied
migrate up (again)    2 UP     runner table: 2 applied
OK  down == baseline (columns, types, nullability, defaults, constraints, indexes)
OK  down keeps every baseline row (PK set)
OK  up#2 == up#1 (pg_dump -s, byte-for-byte)
OK  data after up#2 == after up#1
ROUNDTRIP OK
```

Перевірка самого скрипта після ревʼю (критик знайшов, що `… | grep || true` глушив exit code node-pg-migrate): зламана staged-міграція → `FAIL node-pg-migrate up`, exit 1; проба з помилкою в SQL → `FAIL wrong error`, а не «rejected»; `.js`-передумова в `--after` застосовується самим раннером.

Позитивна перевірка (в транзакції з ROLLBACK): курс з часом, budget з валютою, base currency без budget — приймаються.

## TBDs

- `data-model.md` «Test fixtures» — фабрики після появи `rate` / `budget` у domain.
