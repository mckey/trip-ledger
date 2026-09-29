---
id: DOC-1
title: "Back-port уточнень у словники, PRD §9, документи trip-budget і ARCHITECTURE.md"
epic: multi-currency-summary
project: trip-ledger
bc: cross
layer: docs
wave: 1
priority: Must
estimate: S
blocks: []
blocked_by: []
external_blocked_by: []
status: todo
owner: "Vladimir Makarov"
context_budget: ~2200 tokens
prd_refs: [AC-06, AC-07, AC-09]
sad_refs: ["Critical flow 2", "Critical flow 3"]
data_refs: ["none: лише документи; схема — MIG-1"]
openapi_ops: ["none: контракт не змінюється"]
adr_refs: [0003, 0004]
files: [CONTEXT.md, docs/features/trip-budget/CONTEXT.md, docs/features/trip-budget/sad.md, docs/features/trip-budget/adr/0001-budget-as-columns-on-trips.md, docs/features/multi-currency-summary/PRD.md, ARCHITECTURE.md]
created: 2026-09-29
---

# DOC-1 · Back-port словників і PRD

**Epic:** [multi-currency-summary](./_epic.md) · **Wave:** 1 · **Estimate:** S · **Owner:** Vladimir Makarov

## Місце в послідовності

- **Блокується:** нічим.
- **Блокує:** формально нічого, але в tracker стоїть першою: SAD §11 вимагає fix-term **до** реалізації, щоб сесія агента на EXP-4 не прочитала стару межу counted у кореневому словнику.
- **Чому в цій хвилі:** документи не залежать від коду.

## Why

Фіча перевизначає три чужі терміни: counted (тепер — за effective rate, а не «у base currency»), converted total (з витрат з effective rate) і rate snapshot (ручна заміна — окрема дія). Поки ці уточнення живуть лише у [CONTEXT фічі](../CONTEXT.md#glossary), кореневий словник і trip-budget кажуть інше — це ризик Medium з SAD §11.

## Linked artifacts (read-only — НЕ вставляти вміст)

- 🧭 Джерело уточнень: [CONTEXT фічі · Glossary](../CONTEXT.md#glossary), [Invariants](../CONTEXT.md#invariants)
- ⚠ Ризик: [sad §11](../sad.md#11-risks-and-technical-debt) — рядки «Словник перевизначається», «Scope понад PRD §9», «PRD §9 обіцяв backfill», «Перший двонапрямний зв'язок»
- 🌐 Sequence: [sad §6 · Critical flow 2](../sad.md#6-runtime-view) — де counted рахується за effective rate; Critical flow 3 — лок base currency
- 📜 ADR: [ADR-0003](../adr/0003-expenses-counted-means-has-effective-rate.md) — нова межа counted; [ADR-0004](../adr/0004-cross-base-currency-standalone-locked-via-rated-expenses-port.md) — base currency без budget, правило AC-07
- 📂 Цілі: [кореневий CONTEXT.md](../../../../CONTEXT.md#glossary), [trip-budget CONTEXT](../../trip-budget/CONTEXT.md#glossary), [trip-budget sad §5](../../trip-budget/sad.md#5-building-block-view) і [§12](../../trip-budget/sad.md#12-glossary), [trip-budget ADR-0001](../../trip-budget/adr/0001-budget-as-columns-on-trips.md), [PRD §9](../PRD.md#9-migration-impact), [ARCHITECTURE.md](../../../../ARCHITECTURE.md)
- 🗄 Data delta: none — лише документи
- 🔌 API: none — контракт уже описує нову поведінку

## Acceptance criteria (GWT)

- [ ] **AC-d1-1 (AC-09):** Given кореневий і trip-budget словники, when читати визначення counted / converted total, then обидва кажуть «з effective rate» і NOT-межа посилається на ADR-0003 — жодного «лише у base currency».
- [ ] **AC-d1-2 (AC-07):** Given кореневий `## Invariants`, when читати його після story, then там є правило AC-07 про лок base currency явними курсами.
- [ ] **AC-d1-3 (AC-06):** Given PRD §9, when читати його після story, then backfill курсу 1 замінено на похідне правило (ADR-0003), названо дві колонки і керування base currency в `trips` як back-port з SAD §11.
- [ ] **AC-d1-4 (AC-07):** Given trip-budget sad.md §5, when читати дельту після story, then `TripBudgetPort` має форму `{ baseCurrency, budget }`, CHECK — дозвільна форма з ADR-0004, а ADR-0001 trip-budget каже «перше задання budget фіксує base currency, якщо вона ще не задана».

## Checklist (1 step ≈ 1 commit)

- [ ] Step 1 — `CONTEXT.md` (корінь): converted total, rate snapshot — нові NOT-межі; + інваріант AC-07; `updated_at`.
- [ ] Step 2 — `docs/features/trip-budget/CONTEXT.md`: counted / uncounted expense — за effective rate, з посиланням на цю фічу.
- [ ] Step 3 — `docs/features/multi-currency-summary/PRD.md` §9: backfill → похідне правило; + US «задати/змінити base currency» з AC-06/AC-07 як джерелом (рядок про back-port у Changelog PRD).
- [ ] Step 4 — trip-budget `sad.md` §5 (форма `TripBudgetPort`, CHECK), §12 (counted — за effective rate) і `adr/0001` (рядок-посилання на ADR-0004 цієї фічі; Amendment про `budget_minor >= 0` уже є — не дублювати).
- [ ] Step 5 — `ARCHITECTURE.md`: «trips нічого не знає про витрати» → «BC не імпортують один одного; факти чужого BC — лише через порт з ADR».

## Edge cases

| Кейс | Поведінка |
|---|---|
| PRD має `status: Approved` | Правка — Changelog-рядком, статус не скидаємо: поведінка для owner-а не змінюється |
| trip-budget CONTEXT уже змінено її власними stories | Мерджити, не перетирати; конфлікт — питання мені |

## Definition of Done

- [ ] AC-d1-1..4 перевірено читанням diff-у, а не пошуком слова
- [ ] Жоден із шести файлів (`CONTEXT.md`, trip-budget `CONTEXT.md` / `sad.md` / ADR-0001, `PRD.md`, `ARCHITECTURE.md`) не суперечить CONTEXT фічі щодо AC-09 і AC-07
- [ ] `node .claude/skills/task-forge/scripts/check-tasks.mjs multi-currency-summary --check` зелений (лінки на змінені документи живі)
- [ ] `tracker.md`: DOC-1 → `done`

## Notes

<!-- Сюди виконавець пише причину `blocked` і домовленості, що виникли під час роботи. -->
