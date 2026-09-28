# Migration rules

<!-- Bootstrapped by .claude/skills/schema-forge. Правила — моя практика, не дефолт курсу; правити свідомо. -->

## Раннер

- **node-pg-migrate** (`devDependencies`, `make migrate`). Живе дерево — `migrations/`.
- Legacy `0001_*.sql`, `0002_*.sql` без маркерів раннер читає як up-only — не переписувати.
- `--single-transaction` за замовчуванням: усі pending-файли — одна транзакція.

## Файли

- Нові: `<YYYYMMDDhhmmssSSS>_<verb>_<entity>.sql` — одна зміна = один файл з секціями `-- Up Migration` / `-- Down Migration`.
- Поза транзакцією (`CREATE INDEX CONCURRENTLY`, батчевий backfill з `COMMIT`) — `.js` з `pgm.noTransaction()`, один оператор на файл.
- Staged-файли фічі живуть у `docs/features/<slug>/migrations/` до промоції; у `migrations/` їх переносить implement, перештамповуючи префікс.

## CHECK

Дозволено лише два класи, кожен CHECK іменований `<table>_<rule>_chk`:

- **Дзеркало інваріанта value object-а з `src/shared/`**: `Money` ≥ 0, `Rate` > 0, `DateRange` ends ≥ starts.
- **Форма складеного атрибута**: колонки одного VO не заповнюються наполовину (`<x>_minor` без валюти).

Заборонено (CLAUDE.md: бізнес-логіка в domain/application): enum-списки (`IN (…)`), state-машина, продуктові пороги, `CREATE TRIGGER`, stored procedures, `DEFAULT '<бізнес-значення>'` (дозволено лише `DEFAULT now()`). Legacy-CHECK у 0001/0002 не чіпати без окремого рішення.

Виняток: тимчасовий `CHECK (col IS NOT NULL) NOT VALID` для `SET NOT NULL` на великій таблиці — видаляється в тій самій міграції.

## Accepted ADR

Рішення Accepted ADR про схему має пріоритет над цим файлом. Конфлікт — явне рішення (`Keep ADR / Amend ADR / Override rules`) з записом у `data-model.md`, не мовчазна заміна.

## Типи

- Гроші: `<name>_minor INTEGER` (як `expenses.amount_minor`) + валюта `VARCHAR(3)` ISO 4217. `BIGINT` — лише з ADR.
- Рядки: `VARCHAR(N)` з межею з PRD / стандарту; `TEXT` — вільний текст.
- PK: brownfield — як є (`TEXT` + `randomUUID()`); нові таблиці — `UUID`, значення з застосунку.
- Час: `TIMESTAMPTZ`; дата без часу — `DATE`.
- Audit: без `updated_at`; «коли змінено атрибут» для KPI — `<attr>_set_at TIMESTAMPTZ NULL`.

## Зміни наявних таблиць

- Nullable колонка / послаблення обмеження — expand, одна міграція.
- Новий NOT NULL, rename, retype — expand (+ `DROP NOT NULL` на старій, якщо код кроку 3 перестане її писати раніше) → backfill → contract. Три PR, у кожному — порядок деплою «міграція → код» або «код → міграція».
- Backfill лише нормалізує; неоднозначні значення лишаються `NULL` і йдуть у звіт. Супутник `backfill-<column>.md`: ETA, повтор, відновлення після падіння contract.
- Новий CHECK на наявній таблиці з даними: `NOT VALID` + `VALIDATE CONSTRAINT`, якщо таблиця > 100k рядків; інакше одним `ALTER`.

## Індекси

- Лише під конкретний запит з flow і з оцінкою рядків у зрізі запиту (орієнтир — > 10k). Відхилені кандидати записуються з причиною.
- На FK — завжди.

## Перевірка

- `scripts/db-roundtrip.sh <staged-dir> [--after <dir>] [--probes <file>]` — up → down → up на Postgres з `docker-compose.yml`, до коміту.
- Кожен новий CHECK — негативна проба в `docs/features/<slug>/check-probes.sql`.

## Seeds і фікстури

- Bootstrap / lookup — міграцією, детерміновані UUID, `ON CONFLICT DO NOTHING`.
- Фікстури — TS-фабрики `src/<bc>/testing/`, не в міграціях. PII guard: `Test Trip`, `*@example.test`.
