---
status: Draft
owner: "<автор фічі>"
reviewers: []
updated_at: "<YYYY-MM-DD>"
feature_size: "<з PRD>"
stage: "05"
ticket: "<ticket або ->"
runner: "<node-pg-migrate X.Y | golang-migrate X.Y>"
---

# Data model — <slug>

<!-- schema-forge. Staged-міграції: docs/features/<slug>/migrations/ у форматі раннера <runner>.
Живе migrations/ не змінене; implement промотує з перештампуванням префікса. -->

Одним абзацом: які таблиці змінюються, чому (AC / ADR), на які staged-міграції сусідніх фіч це спирається.

## Рішення ADR ↔ rules

<!-- Кожен конфлікт Accepted ADR з .claude/rules/migrations.md і як його вирішено. Немає — «конфліктів немає». -->

| ADR | Що каже | Правило | Рішення |
|---|---|---|---|
| `<NNNN-bc-…>` | <рішення про схему> | <пункт rules> | Keep ADR / Amend ADR / Override rules — <чому> |

## ER diagram

```mermaid
erDiagram
    <PARENT> ||--o{ <CHILD> : "<зв'язок>"
    <CHILD> {
        text id PK
        text parent_id FK
        integer amount_minor "Money"
    }
```

## Entities

### `<table>` (<aggregate root | частина агрегата X> — BC <bc>)

| Column | Type | Constraints | Джерело | Notes |
|---|---|---|---|---|
| `<col>` | <type> | <NULL / NOT NULL / FK> | <AC-NN / ADR / SAD §N / legacy> | <new / legacy> |

**Access patterns:** <запит з flow N> → <індекс або PK>.

## CHECK

<!-- Лише класи (а) дзеркало VO з shared/ і (б) форма складеного атрибута. Legacy — окремим рядком «legacy, не чіпаємо». -->

| Constraint | Вираз | Клас | Дзеркало чого | Проба (має впасти) |
|---|---|---|---|---|
| `<table>_<rule>_chk` | `<expr>` | (а) / (б) | `<shared/Vo.ts>` інваріант / <складений атрибут> | `<SQL у check-probes.sql>` |

## Breaking changes

<!-- Немає — «немає». Є — таблиця кроків; супутник backfill-<column>.md. -->

| Крок | Міграція | Код у тому ж PR | Порядок деплою |
|---|---|---|---|
| 1 expand | `<file>` | <dual-write, читання старої> | міграція → код |
| 2 backfill | `<file>` | <читання нової> | міграція → код |
| 3 contract | `<file>` | <запис лише нової> | код → міграція |

## Indexes

| Index | Columns | Query it serves | Рядків у зрізі | Рішення |
|---|---|---|---|---|
| `<idx>` | `<cols>` | <flow N: запит> | <оцінка з SAD §7> | прийнято / відхилено — <чому> |

## Domain ↔ columns

<!-- Основа drift: TS-поле → колонка. Статус: exists / expected-staged / real-drift. -->

| Domain field | Column | Статус |
|---|---|---|
| `<Entity>.<field>: <Type>` | `<table>.<column>` | exists / expected-staged (<file>) / real-drift |

## Promotion order

<!-- Порядок промоції staged-файлів цієї фічі відносно staged сусідніх фіч. -->

1. `<feature>/<file>` — <чому раніше>
2. …

## Roundtrip

`scripts/db-roundtrip.sh docs/features/<slug>/migrations [--after …] --probes docs/features/<slug>/check-probes.sql` — підсумок і нюанси (порядок колонок після down, канонізовані дані тощо).

## Test fixtures

- `a<Entity>({ … })` — `src/<bc>/testing/a<Entity>.ts`; <згенеровано / TBD до появи полів у domain>.
