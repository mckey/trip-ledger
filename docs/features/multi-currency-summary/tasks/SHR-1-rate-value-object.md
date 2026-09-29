---
id: SHR-1
title: "Value object Rate у shared: BigInt ×10⁹, parse ≤ 9 знаків, apply half-up"
epic: multi-currency-summary
project: trip-ledger
bc: shared
layer: domain
wave: 1
priority: Must
estimate: M
blocks: [EXP-1, EXP-4]
blocked_by: []
external_blocked_by: []
status: todo
owner: "Vladimir Makarov"
context_budget: ~2600 tokens
prd_refs: [AC-02, AC-03b]
sad_refs: ["Critical flow 2"]
data_refs: [data-model.md#check]
openapi_ops: [setExpenseRate, getTripSummary]
adr_refs: [0002]
files: [src/shared/Rate.ts, src/shared/Rate.test.ts]
created: 2026-09-29
---

# SHR-1 · Value object `Rate` у `shared/`

**Epic:** [multi-currency-summary](./_epic.md) · **Wave:** 1 · **Estimate:** M · **Owner:** Vladimir Makarov

## Місце в послідовності

- **Блокується:** нічим — чистий TypeScript без залежностей.
- **Блокує:** EXP-1 (`Expense.rate?: Rate`), EXP-4 (перерахунок у `BudgetBlock` через `Rate.apply`).
- **Чому в цій хвилі:** фундамент точності — на ньому стоять і збереження курсу, і converted total.

## Why

Курс на дроті — десятковий рядок, у пам'яті — ціле, у БД — `BIGINT`; плаваюча точка заборонена на всьому ланцюжку. Story дає один тип, через який проходить кожен курс: закриває точність дрібних валют (AC-03b) і форму «додатне число, ≤ 9 знаків» (AC-02) на рівні домену.

## Linked artifacts (read-only — НЕ вставляти вміст)

- 🧭 Domain: [CONTEXT · Invariants](../CONTEXT.md#invariants) — «rate snapshot завжди додатний», «half-up, ≤ 1 minor unit»; [Glossary](../CONTEXT.md#glossary) — effective rate
- 🌐 Sequence: [sad §6 · Critical flow 2](../sad.md#6-runtime-view) — крок «converted total = Σ Rate.apply(amount)»
- 🗄 Data delta: [data-model · CHECK](../data-model.md#check) — `expenses_rate_nano_positive_chk` дзеркалить інваріант цього VO
- 🔌 API: [openapi.yaml](../contracts/openapi.yaml) — схема `Rate` (рядок з регуляркою ≤ 9 знаків), її читають `setExpenseRate` і `getTripSummary`
- 📜 ADR: [ADR-0002](../adr/0002-shared-rate-as-bigint-scaled-1e9-half-up.md) — шкала 10⁹, half-up, межа представлення 10⁻⁹
- 📐 Якість: [sad §10 · QG-1](../sad.md#10-quality-requirements) — числа для property-тесту
- 📋 PRD: [AC-02](../PRD.md#ac-02-us-01--validation), [AC-03b](../PRD.md#ac-03b-us-02--дрібна-валюта-edge-доданий-через-add-edge-case)

## Acceptance criteria (GWT)

- [ ] **AC-s1-1 (AC-02):** Given рядок `"0"`, `"-1.5"` або `"1.1234567890"` (10 знаків), when `Rate.parse(...)`, then кидається `InvalidRateError` і жодного `Rate` не створено.
- [ ] **AC-s1-2 (AC-02):** Given рядок `"0.9123"`, when `Rate.parse`, then `toString()` повертає `"0.912300000"` (завжди 9 знаків — форма контракту, api-sync-report F4), а внутрішнє значення — `912300000n`.
- [ ] **AC-s1-3 (AC-03b):** Given `Money(100000000, 'VND')` і курс `"0.000037037"`, when `rate.apply(money, 'EUR')`, then результат — `Money(3704, 'EUR')`, не нуль.
- [ ] **AC-s1-4 (AC-03b):** Given випадкові пари (сума ≤ 10¹², курс ≤ 9 знаків), when `apply`, then відхилення від точного добутку ≤ 1 minor unit і округлення — half-up.

## Checklist (1 step ≈ 1 commit)

- [ ] Step 1 — `src/shared/Rate.ts`: клас з приватним `nano: bigint`, `static ONE`, конструктор відкидає `nano <= 0n`.
- [ ] Step 2 — `Rate.parse(s: string)`: регулярка ≤ 9 знаків після крапки, без експоненти й знака; `InvalidRateError` у тому ж файлі (shared не залежить від BC-помилок).
- [ ] Step 3 — `toString()` завжди з 9 знаками після крапки (як приклади контракту); `toNano(): bigint` і `static fromNano(bigint)` для репозиторію (EXP-5).
- [ ] Step 4 — `apply(money: Money, target: string): Money` — цілочисельно: `(amount × nano + 5·10⁸) / 10⁹`, результат через конструктор `Money`.
- [ ] Step 5 — `src/shared/Rate.test.ts`: AC-s1-1..3 + property-тест AC-s1-4 під назвою з QG-1 `it('applies a rate with at most 1 minor unit of error (half-up)')`, без нових залежностей (детермінований генератор з seed).

## Edge cases

| Кейс | Поведінка |
|---|---|
| `"1e-7"` (так серіалізує JS number) | `InvalidRateError` — саме тому курс на дроті рядок (ADR-0002) |
| `"00.5"`, `".5"` | `InvalidRateError` — той самий `pattern`, що в схемі `Rate` контракту: ціла частина без провідних нулів, цифра перед крапкою обов'язкова |
| Курс < 10⁻⁹ | Не представний — `InvalidRateError`, accepted debt SAD §11 |
| Сума × курс > 2⁵³ | BigInt, переповнення немає; `Money` приймає результат лише як safe integer — інакше кидає |

## Definition of Done

- [ ] `Rate.test.ts` зелений, включно з property-тестом AC-03b на ≥ 1000 пар
- [ ] У `Rate.ts` немає жодного `Number(`/`parseFloat` на шляху курсу (grep у PR-описі)
- [ ] `node_modules/.bin/tsc --noEmit` і `npx vitest run src/shared` зелені; dependency-guard мовчить (shared нічого не імпортує з BC)
- [ ] `tracker.md`: SHR-1 → `done`

## Notes

<!-- Сюди виконавець пише причину `blocked` і домовленості, що виникли під час роботи. -->
