---
name: schema-forge
description: >
  Мій форк sdlc:generate-data-model: data-model.md + staged SQL-міграції у
  форматі раннера з репо (trip-ledger — node-pg-migrate, один .sql з up/down
  секціями) + виконуваний roundtrip up → down → up на Postgres з docker compose.
  CHECK лише як дзеркало інваріанта VO з shared/ або форма складеного атрибута;
  Accepted ADR важливіший за дефолти. Тригери: «schema-forge <slug>», «модель
  даних для <slug>», «міграції для <slug>», «/schema-forge <slug>». Пише
  docs/features/<slug>/data-model.md, staged migrations/ і _audit/. Standalone.
---

# Skill: schema-forge — модель даних і міграції під мою практику

Той самий конвеєр, що у `sdlc:generate-data-model` (prereq → rules bootstrap → читання джерел → агрегати → колонки → індекси → `data-model.md` → staged-міграції → seeds → drift → breaking changes → self-check → аудит → коміт), але правила, формат файлів і перевірки переписані під те, як реально влаштовані мої репо: Node + Express + `pg` без ORM, Clean Architecture з портами між BC, гроші тільки в minor units через value objects у `shared/`, міграції — plain SQL, одна людина пише й деплоїть.

## Відмінності від готового generate-data-model (навіщо форк)

1. **Раннер з репо, а не з дефолту скіла.** Скіл визначає раннер з `Makefile` / `package.json` / формату файлів у `migrations/` і пише staged-файли одразу в його форматі. У trip-ledger це `node-pg-migrate` → один файл `<YYYYMMDDhhmmssSSS>_<verb>_<entity>.sql` (utc-префікс раннера) з секціями `-- Up Migration` / `-- Down Migration`. Пари `.up.sql` / `.down.sql` — лише якщо раннер golang-migrate. Готовий скіл завжди пише пари під golang-migrate, і при промоції їх довелося б конвертувати.
2. **Транзакційна модель раннера — частина правил.** `node-pg-migrate` за замовчуванням `--single-transaction`: усі pending-міграції в одному `BEGIN … COMMIT`, а в `.sql`-файлі транзакцію не вимкнути. Тому `CREATE INDEX CONCURRENTLY` і батчевий backfill з `COMMIT` — це `.js`-міграція з `pgm.noTransaction()` ([шаблон](./templates/migration-notx.js)), а не `.sql`. Готовий скіл знає лише golang-migrate.
3. **CHECK: вузький дозволений клас замість повної заборони.** Дозволено рівно два види, кожен іменований `<table>_<rule>_chk` і з рядком «дзеркало чого» в `data-model.md`:
   - (а) **дзеркало інваріанта value object-а з `src/shared/`** — `Money` ≥ 0, `Rate` > 0, `DateRange` ends ≥ starts. Ці інваріанти універсальні, не залежать від продуктових рішень і вже живуть у конструкторі VO (CLAUDE.md: «валідація інваріантів у конструкторі»);
   - (б) **форма складеного атрибута** — колонки, які разом утворюють один VO, не можуть бути заповнені наполовину (`budget_minor` без валюти — не гроші).

   Заборонено (CLAUDE.md: бізнес-логіка — в domain/application, не в інфраструктурі): enum-списки (`status IN (…)`, `category IN (…)`), правила state-машини, продуктові пороги (budget > 0 — правило AC-02, не `Money`), `TRIGGER`, stored procedures, `DEFAULT '<бізнес-значення>'`. Legacy-CHECK не чіпаються, лише перелічуються в аудиті.
4. **Accepted ADR > дефолт скіла.** Якщо ADR фічі (або сусідньої, на яку посилається SAD) фіксує рішення про схему — тип, CHECK, форму колонки — скіл виконує ADR, а конфлікт з `.claude/rules/migrations.md` виносить питанням `Keep ADR / Amend ADR / Override rules`. Готовий скіл застосовує свої дефолти мовчки і пише розходження лише в аудит (на trip-budget так зник CHECK з Accepted ADR-0001).
5. **Вхід — мій SAD, а не §6.4 ER.** arch-forge не пише §6.4. Джерела: SAD §5 «Дельта міграцій» і «Дельта файлів», ADR `NNNN-<bc>-*` (bc ∈ trips | expenses | shared | http | cross), §6 flows, §7 обсяг даних, §8 Persistence; кореневий `CONTEXT.md` — Glossary дає назви колонок, Invariants кажуть, що backfill НЕ має права мутувати. Перед читанням flows — `mermaid.parse()` §6: зламаний flow — зламаний вхід для індексів (на обох фічах trip-ledger flows з уроку 6.4 не парсились).
6. **Expand → backfill → contract з порядком деплою.** Таблиця кроків «міграція / код у тому ж PR / порядок деплою». Expand також послаблює стару колонку (`DROP NOT NULL`), якщо код кроку 3 перестане її писати раніше, ніж contract її видалить — у шаблоні готового скіла цього кроку немає. Backfill лише нормалізує написання; неоднозначні значення лишаються `NULL` і йдуть у звіт, а не в `UPDATE` (Invariant «витрата зберігає валюту введення»). `SET NOT NULL` на таблиці > 100k рядків — через тимчасовий `CHECK (col IS NOT NULL) NOT VALID` → `VALIDATE` → `SET NOT NULL` → `DROP CONSTRAINT`: технічний CHECK, єдиний виняток з п. 3.
7. **Індекс = запит + обсяг.** Кандидат з flow проходить, лише якщо є конкретний запит **і** оцінка рядків у зрізі цього запиту (SAD §7, PRD §1) показує, що наявного індексу чи seq scan мало (орієнтир: > 10k рядків у зрізі). Відхилені кандидати теж пишуться в таблицю індексів — з цифрою, чому ні.
8. **Roundtrip — п'ятий пункт self-check, виконуваний.** `scripts/db-roundtrip.sh` (якщо в репо немає — з [`./templates/db-roundtrip.sh`](./templates/db-roundtrip.sh)): Postgres з `docker-compose.yml`, baseline = живі `migrations/` + сид + up-частина staged-передумов сусідніх фіч (`--after`), далі up → down → up; down == baseline за каталогом, up#2 == up#1 за `pg_dump -s`, дані між двома up однакові. Для кожного нового CHECK — негативна проба (`--probes`), яка мусить упасти.
9. **Drift по TS-домену з класифікацією.** Мапінг: поле `camelCase` → колонка `snake_case`; `Money` → `<x>_minor` + валютна колонка; `Rate` → `rate_nano`; `Date` → `DATE` / `TIMESTAMPTZ`. Кожна знахідка має клас: **expected-staged** (колонка з staged-міграції, код ще не написаний — це чекліст для implement, не шум) або **real** (fix-міграція в `_drift/`). Готовий скіл змішує обидва.
10. **Українською; коміт у наскрізному ряду артефактів:** `04: data-model for <slug> via schema-forge`.

## Owner

Автор фічі (зазвичай я) як backend lead. На робочих фічах з живими даними — плюс той, хто деплоїть, як reviewer таблиці кроків breaking change.

## When to use

- «schema-forge <slug>», «модель даних для <slug>», «міграції для <slug>» — після SAD + ADR і після `complete-sequence-diagrams` (flows мають парситись).
- `--drift-only` — лише drift (п. 9) без генерації, on demand. Не в pre-commit і не в CI: розходження під час розробки часто очікуване, а живої схеми там немає.
- Skip, якщо `data-model.md` існує і кожна зміна з нього має staged-файл, що пройшов roundtrip.

## Inputs

**Hard required** (без них — стоп із вказівкою, що бракує):

- `<slug>`; `docs/features/<slug>/PRD.md` (§4 US, §5 AC; §9 Migration impact — якщо є, у PRD до prd-forge його немає); `docs/features/<slug>/sad.md` (§5 дельти, §6 flows, §7 обсяг, §8 Persistence) + `adr/`.
- Кореневий `CONTEXT.md` (Glossary + Invariants), `CLAUDE.md` (правило «бізнес-логіка не в інфраструктурі»).
- `docker` з compose — без нього п. 8 не виконати, і скіл так і пише в аудиті, а не мовчки пропускає.

**Optional:** staged-міграції сусідніх фіч, на які спирається ця (`docs/features/*/migrations/`) — стають `--after` для roundtrip і перевіряються на порядок промоції; `docs/features/<slug>/CONTEXT.md`.

## Defaults (моя house style)

| Тема | Default | Чому |
|---|---|---|
| Раннер і формат | з репо (`Makefile`, `package.json`); у trip-ledger — node-pg-migrate, `.sql` з up/down-секціями | Один формат у живому `migrations/`, без конвертації при промоції |
| Ім'я файлу | `<YYYYMMDDhhmmssSSS>_<verb>_<entity>.sql` — `node-pg-migrate create <name> -j sql --migration-filename-format utc` (без прапорця раннер дає 13-значний epoch ms) | Раннер сортує за префіксом; гілки не колізять |
| Транзакції | `.sql` = у транзакції раннера; `CONCURRENTLY` / батчі з `COMMIT` → `.js` + `pgm.noTransaction()` | `--single-transaction` за замовчуванням |
| Ідемпотентність DDL | `IF NOT EXISTS` / `IF EXISTS`; для constraint — `DROP CONSTRAINT IF EXISTS` у down | Повтор частково застосованого файлу не падає |
| PK | brownfield-таблиці — як є (`TEXT` + `randomUUID()`); нові — `UUID`, значення з застосунку | Не міняю тип PK без окремого ADR |
| Гроші | `<name>_minor` того ж типу, що наявні суми (`INTEGER`), + валютна колонка `VARCHAR(3)` | Дзеркало `Money`; `BIGINT` — лише з ADR (як `rate_nano`) |
| Рядки | `VARCHAR(N)` з межею з PRD / ISO; `TEXT` для вільного тексту | Межа = документація |
| Audit-колонки | без `updated_at`; якщо KPI треба «коли змінено атрибут» — `<attr>_set_at TIMESTAMPTZ NULL` поруч, перезаписується | Immutable-first без втрати відповіді на KPI |
| Delete | hard delete | Як у курсі |
| CHECK | лише класи (а) і (б) з п. 3, іменовані | Див. п. 3 |
| Нові NOT NULL / rename / retype | expand (+ послабити стару) → backfill → contract, таблиця деплою | Див. п. 6 |
| Індекси | запит + оцінка рядків; на наявній таблиці — `CONCURRENTLY` у `.js` noTransaction | Див. п. 7 |
| Out of scope | репліки, партиціювання, матвʼю | Як у курсі |

## Protocol

1. **Prereq check (hard).** Файли з Inputs є; `docker compose version` працює. Розмір — з `feature_size` PRD.
2. **Rules bootstrap / звірка.** Немає `.claude/rules/migrations.md` → копія [`./templates/rules-migrations-baseline.md`](./templates/rules-migrations-baseline.md), повідомити. Є, але з маркером `Bootstrapped by sdlc/plugin/skills/generate-data-model` → показати різницю з моїм baseline і спитати `Replace / Merge / Keep`; вже staged-файли інших фіч перелічити в аудиті як «згенеровані під старі правила».
3. **Визначити раннер.** `Makefile` → `package.json` (devDependencies) → формат наявних `migrations/*`. Записати: раннер, версія, транзакційна модель, як він читає legacy-файли (node-pg-migrate трактує `.sql` без маркерів як up-only і на кожному запуску пише `Can't determine timestamp for 0001` як error — це шум, не падіння; прибирається лише перейменуванням legacy, чого не робимо).
4. **Mermaid-gate на §6.** `mermaid.parse()` кожного блоку `sad.md`: `npx -y @mermaid-js/mermaid-cli -i docs/features/<slug>/sad.md -o <tmp>.md` (exit ≠ 0 = зламаний блок), або без Chromium — `node ./templates/mmd-extract.mjs docs/features/<slug>/sad.md > check.js` і виконати `check.js` у DevTools будь-якої https-сторінки (імпортує `mermaid@11` з jsDelivr, друкує OK/FAIL по блоках). Падає → стоп і вказівка на `complete-sequence-diagrams`; data-model з непарсованих flows не будується.
5. **Прочитати джерела в порядку пріоритету:** Accepted ADR (схемні рішення — обов'язкові) → SAD §5 «Дельта міграцій» → PRD §4/§5/§9 → §6 persist/read-кроки → §7 обсяг → CONTEXT Invariants → живі `migrations/` (offline-парс) → staged сусідніх фіч.
6. **Конфлікти ADR ↔ rules** (п. 4 відмінностей). Кожен — питання з рекомендацією; рішення записати в `data-model.md` §«Рішення».
7. **Агрегати і колонки** за Defaults; для кожної колонки — «Джерело» (AC / ADR / SAD §). `updated_at` не додається мовчки ніколи.
8. **CHECK-класифікація.** Для кожного CHECK з ADR/SAD: клас (а) / (б) / заборонений. Заборонений з Accepted ADR → питання з п. 6, а не видалення.
9. **Індекси** за п. 7: таблиця «прийнято / відхилено» з запитом і оцінкою рядків.
10. **`data-model.md`** з [`./templates/data-model.md`](./templates/data-model.md); `erDiagram` → `mermaid.parse()`.
11. **Staged-міграції** у `docs/features/<slug>/migrations/` у форматі раннера з [`./templates/migration.sql`](./templates/migration.sql) / [`./templates/migration-notx.js`](./templates/migration-notx.js). Живе `migrations/` не чіпається.
12. **Breaking changes** — таблиця кроків з порядком деплою (п. 6), супутник `backfill-<column>.md` з ETA, повтором і шляхом відновлення після падіння contract.
13. **Seeds і фікстури.** Bootstrap / lookup — як у курсі (детерміновані UUID, `ON CONFLICT DO NOTHING`); фікстури — TS-фабрики `src/<bc>/testing/a<Entity>.ts`, генеруються лише коли поля вже є в domain (інакше `tsc` впаде) — до того лише список у `data-model.md`. PII guard: `Test Trip`, `*@example.test`.
14. **Drift** (п. 9): schema-vs-source з класами expected-staged / real; model-vs-spec проти PRD/SAD/ADR і CONTEXT.
15. **Self-check (5):** naming; up/down-симетрія; FK-індекси; заборонені фічі (grep по не-коментарних рядках: `CHECK` поза дозволеними іменами, `CREATE TRIGGER`, `DEFAULT '`); **roundtrip** `scripts/db-roundtrip.sh <dir> [--after …] --probes docs/features/<slug>/check-probes.sql`. Будь-який FAIL — виправити або показати, без коміту.
16. **Аудит** `docs/features/<slug>/_audit/data-model-<date>.md`: згенеровані файли, раннер, рішення ADR ↔ rules, CHECK-класи, індекси з відхиленими, drift з класами, roundtrip-вивід, порядок промоції відносно staged сусідніх фіч, TBD.
17. **Коміт** `04: data-model for <slug> via schema-forge` + handoff: що зроблено, що переглянути, далі — API contracts.

## Definition of Done

- `data-model.md` з ER (парситься), колонками з джерелом, CHECK-таблицею з класами, індексами (прийняті й відхилені з цифрою), таблицею breaking change з порядком деплою, мапінгом domain → колонки.
- Staged-файли у форматі раннера репо; живе `migrations/` не змінене.
- Self-check 5/5, roundtrip OK з виводом в аудиті; кожен новий CHECK має негативну пробу, яка впала.
- Кожен конфлікт Accepted ADR ↔ rules вирішений явно і записаний.

## Anti-patterns

- **Писати пари `.up/.down.sql`, коли репо живе на node-pg-migrate** (і навпаки) — промоція перетвориться на ручну конвертацію.
- **`CONCURRENTLY` або `COMMIT` у `.sql`-міграції node-pg-migrate** — впаде всередині транзакції раннера.
- **Мовчки прибрати CHECK, який обрав Accepted ADR**, або мовчки додати enum-CHECK, бо «так було в 0001».
- **Contract без послаблення старої колонки** — вставки падають між деплоєм коду й міграцією.
- **Backfill, що вгадує дані** (`'грн'` → `UAH`) — рішення owner-а, не міграції.
- **Індекс «про всяк випадок»** або без оцінки рядків.
- **Звіт drift, де planned-колонки змішані зі справжніми розходженнями.**
- **Roundtrip «на око»** — лише скрипт з порівнянням каталогу і `pg_dump`.

## Templates

- [`./templates/data-model.md`](./templates/data-model.md) — структура `data-model.md`.
- [`./templates/rules-migrations-baseline.md`](./templates/rules-migrations-baseline.md) — мій baseline `.claude/rules/migrations.md`.
- [`./templates/migration.sql`](./templates/migration.sql) — node-pg-migrate SQL-міграція (у транзакції раннера).
- [`./templates/migration-notx.js`](./templates/migration-notx.js) — node-pg-migrate JS-міграція поза транзакцією (`CONCURRENTLY`, батчевий backfill).
- [`./templates/db-roundtrip.sh`](./templates/db-roundtrip.sh) — roundtrip-скрипт для репо, де його ще немає; блоки `REPO-SPECIFIC` (креденшели, ім'я compose-проєкту, сид, `data()` / `ids()`) переписати під репо.
- [`./templates/mmd-extract.mjs`](./templates/mmd-extract.mjs) — Mermaid-gate без mermaid-cli: витягає блоки з `.md` у готовий до DevTools `mermaid.parse()`-скрипт.
