---
id: MIG-1
title: "Промоція staged-міграції rate snapshot на expenses"
epic: multi-currency-summary
project: trip-ledger
bc: expenses
layer: migration
wave: 1
priority: Must
estimate: S
blocks: [EXP-5]
blocked_by: []
external_blocked_by: ["trip-budget:T3"]
status: todo
owner: "Vladimir Makarov"
context_budget: ~2400 tokens
prd_refs: [AC-01, AC-05]
sad_refs: ["Critical flow 1", "Critical flow 3"]
data_refs: [data-model.md#promotion-order, data-model.md#check, migrations/20260928140000000_add_rate_snapshot_to_expenses.sql]
openapi_ops: ["none: схема БД — на дріт не виходить; поля курсу на дроті — HTTP-1"]
adr_refs: [0001, 0002]
files: [migrations/, docs/features/multi-currency-summary/migrations/20260928140000000_add_rate_snapshot_to_expenses.sql, docs/features/multi-currency-summary/check-probes.sql]
created: 2026-09-29
---

# MIG-1 · Промоція staged-міграції rate snapshot

**Epic:** [multi-currency-summary](./_epic.md) · **Wave:** 1 · **Estimate:** S · **Owner:** Vladimir Makarov

## Місце в послідовності

- **Блокується:** зовнішньо — trip-budget T3: вона промотує `…120000_add_budget_to_trips` **разом** з `…140100_add_budget_checks_to_trips` цієї фічі (Promotion order п. 3 вимагає одного деплою — тому CHECK-и `trips` живуть у T3, а не тут).
- **Блокує:** EXP-5 (Postgres-репозиторій читає/пише `rate_nano`, `rate_set_at`).
- **Чому в цій хвилі:** усередині епіку ні від чого не залежить; код домену і міграція йдуть паралельно.

## Why

Курс має де жити до того, як репозиторій почне його писати (AC-01), а заміна курсу — перезаписувати ту саму пару колонок без журналу (AC-05). Міграція незалежна від ланцюжка `currency_code` і може йти будь-коли після п. 1 Promotion order.

## Linked artifacts (read-only — НЕ вставляти вміст)

- 🗄 Data delta: [data-model · Promotion order](../data-model.md#promotion-order) — п. 2 і обов'язкове перештампування; [CHECK](../data-model.md#check) — `expenses_rate_nano_positive_chk`, `expenses_rate_snapshot_pair_chk` і їхні проби; [Roundtrip](../data-model.md#roundtrip) — команда для staged-перевірки
- 🗄 Staged: [`…140000_add_rate_snapshot_to_expenses.sql`](../migrations/20260928140000000_add_rate_snapshot_to_expenses.sql), проби — [check-probes.sql](../check-probes.sql)
- 🌐 Sequence: [sad §6 · Critical flow 1](../sad.md#6-runtime-view) — «зберегти витрату (… rate_nano + rate_set_at або NULL)»; Critical flow 3 — upsert при заміні курсу
- 📜 ADR: [ADR-0001](../adr/0001-expenses-rate-snapshot-as-nullable-column-on-expenses.md), [ADR-0002](../adr/0002-shared-rate-as-bigint-scaled-1e9-half-up.md)
- 📏 Правила: [`.claude/rules/migrations.md`](../../../../.claude/rules/migrations.md) — формат файлу, `--single-transaction`, 17-значний префікс
- 📋 PRD: [§9 Migration impact](../PRD.md#9-migration-impact) — backfill звідти свідомо не робимо (ADR-0003)

## Acceptance criteria (GWT)

- [ ] **AC-m1-1 (AC-01):** Given живі `0001`/`0002` + промотовані файли trip-budget T3, when `npx node-pg-migrate up`, then в `expenses` є `rate_nano BIGINT NULL` і `rate_set_at TIMESTAMPTZ NULL`, наявні рядки мають обидва `NULL`.
- [ ] **AC-m1-2 (AC-05):** Given застосована міграція, when проба пише `rate_nano` без `rate_set_at` або `rate_nano = 0`, then вставка падає на `expenses_rate_snapshot_pair_chk` / `expenses_rate_nano_positive_chk`.
- [ ] **AC-m1-3 (AC-01):** Given свіжа БД з промотованим деревом, when `up` → `down` до стану до цієї міграції → `up`, then `pg_dump -s` ідентичний першому `up`.

## Checklist (1 step ≈ 1 commit)

- [ ] Step 1 — До промоції: staged-перевірка командою з data-model «Roundtrip» (`db-roundtrip.sh` на staged-каталозі з `--after` trip-budget і `--probes`) — вивід у PR.
- [ ] Step 2 — Перевірити в `migrations/`, що файли trip-budget T3 уже промотовані (інакше story `blocked`, причина — у «Notes»).
- [ ] Step 3 — Скопіювати `…140000` у `migrations/` з новим 17-значним utc-префіксом **після** файлів T3 (Promotion order п. 2).
- [ ] Step 4 — Після промоції: свіжа БД з `docker-compose.yml`, `npx node-pg-migrate up` / `down 1` / `up` і порівняння `pg_dump -s` (AC-m1-3); проби AC-m1-2 з `check-probes.sql`.
- [ ] Step 5 — Staged-файл лишити на місці з позначкою «promoted as <ім'я>» у шапці data-model (провенанс).

## Edge cases

| Кейс | Поведінка |
|---|---|
| Префікс без перештампування | node-pg-migrate розбирає як час лише 13- і 17-значні префікси — інший порядок застосування; саме тому Step 3 |
| T3 ще не злита | `blocked`: міграція технічно незалежна, але промоція поза Promotion order ламає порядок для наступних файлів |
| Legacy `0001`/`0002` пишуть «Can't determine timestamp» | Шум раннера, не падіння (rules) |

## Definition of Done

- [ ] Staged roundtrip (Step 1) і roundtrip після промоції (AC-m1-3) зелені на Postgres з `docker-compose.yml`, вивід у PR
- [ ] `…140000` у `migrations/` з 17-значним префіксом після файлів T3; проби AC-01 і AC-05 падають на своїх CHECK
- [ ] `check-probes.sql` не змінено або змінено разом з новим CHECK
- [ ] `tracker.md`: MIG-1 → `done`

## Notes

<!-- Сюди виконавець пише причину `blocked` і домовленості, що виникли під час роботи. -->
