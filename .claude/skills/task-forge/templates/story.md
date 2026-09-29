---
id: EXP-2                        # <PREFIX>-<n>; префікс з bc/layer — див. SKILL.md «ID»
title: "<імператив, конкретно>"
epic: <slug>
project: trip-ledger
bc: expenses                     # trips | expenses | shared | http | cross (як ADR-naming arch-forge)
layer: application               # migration | domain | application | infrastructure | presentation | wiring | e2e | docs
wave: 2
priority: Must                   # Must | Should | Could
estimate: M                      # S = 2h · M = пів дня · L = день; більше — ділити
blocks: [HTTP-1]
blocked_by: [SHR-1, EXP-1]
external_blocked_by: []          # ["trip-budget:T4"] — story іншого епіку, без якої ця не стартує
status: todo                     # todo | wip | done | blocked
owner: "Vladimir Makarov"
context_budget: ~2500 tokens     # ≥ оцінки check-tasks (ASCII/4 + решта/2), ≤ 5000
prd_refs: [AC-01, AC-02]         # лише ID з PRD §5
sad_refs: ["Critical flow 1"]    # дослівна мітка flow з sad.md §6; без ком усередині
data_refs: [data-model.md#expenses-aggregate-root--bc-expenses]   # або ["none: <чому>"]
openapi_ops: [addExpense]        # operationId з contracts/openapi.yaml; або ["none: <чому>"]
adr_refs: ["0001", "0003"]
files: [src/expenses/application/AddExpense.ts, src/expenses/application/AddExpense.test.ts]
created: YYYY-MM-DD
---

# EXP-2 · <title>

**Epic:** [<slug>](./_epic.md) · **Wave:** 2 · **Estimate:** M · **Owner:** Vladimir Makarov

## Місце в послідовності

- **Блокується:** SHR-1 (<що саме звідти береться>), EXP-1 (<…>).
- **Блокує:** HTTP-1 (<…>).
- **Чому в цій хвилі:** <одне речення>.

## Why

<!-- 1–2 речення: US з PRD своїми словами + які AC закриває. Без копії тексту AC. -->

## Linked artifacts (read-only — НЕ вставляти вміст)

- 🧭 Domain: [CONTEXT.md · Glossary](../CONTEXT.md#glossary) — <терміни>, [Invariants](../CONTEXT.md#invariants) — <які>
- 🌐 Sequence: [sad §6 · Critical flow 1](../sad.md#6-runtime-view) — гілки `alt …`, які реалізує story
- 🗄 Data delta: [data-model · `expenses`](../data-model.md#…) — <колонка/CHECK>; або «none — <чому>»
- 🔌 API: [openapi.yaml](../contracts/openapi.yaml) — `addExpense` → `AddExpenseRequest`, `AddExpenseResponse`; помилки `expenses.…`
- 📜 ADR: [ADR-0001](../adr/0001-….md) — <яке обмеження звідти>
- 📋 PRD: [PRD §5](../PRD.md#5-acceptance-criteria) — AC-01, AC-02

## Acceptance criteria (GWT)

<!-- ≥ 2; кожен з ID PRD AC; Given = фікстура, When = один виклик, Then = спостережуваний результат. -->
- [ ] **AC-e2-1 (AC-01):** Given <фікстура>, when <виклик>, then <результат>.
- [ ] **AC-e2-2 (AC-02):** Given <…>, when <…>, then <…>.

## Checklist (1 step ≈ 1 commit)

- [ ] Step 1 — <файл/клас/метод> — <що саме>.
- [ ] Step 2 — <…>.
- [ ] Step 3 — тести `<file>.test.ts`: AC-e2-1..N.

## Edge cases

| Кейс | Поведінка |
|---|---|
| <…> | <…> |

## Definition of Done

<!-- Специфічно під story: хоча б один пункт з її AC або її файлом. Не копія шаблону. -->
- [ ] <тест `it('…')` у `<file>` зелений — AC-01>
- [ ] `node_modules/.bin/tsc --noEmit` + `npx vitest run <scope>` зелені; dependency-guard не спрацьовує
- [ ] `tracker.md`: статус `done`, коміт `<ID>: …`

## Notes

<!-- Причина `blocked`, домовленості під час роботи, lane зі story сусіднього епіку. -->
