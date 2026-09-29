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
status: done
owner: "Vladimir Makarov"
context_budget: ~2600 tokens
prd_refs: [AC-02, AC-03b]
sad_refs: ["Critical flow 2"]
data_refs: [data-model.md#check]
openapi_ops: [setExpenseRate, getTripSummary]
adr_refs: ["0002"]
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

- [x] **AC-s1-1 (AC-02):** Given рядок `"0"`, `"-1.5"` або `"1.1234567890"` (10 знаків), when `Rate.parse(...)`, then кидається `InvalidRateError` і жодного `Rate` не створено.
- [x] **AC-s1-2 (AC-02):** Given рядок `"0.9123"`, when `Rate.parse`, then `toString()` повертає `"0.912300000"` (завжди 9 знаків — форма контракту, api-sync-report F4), а внутрішнє значення — `912300000n`.
- [x] **AC-s1-3 (AC-03b):** Given `Money(100000000, 'VND')` і курс `"0.000037037"`, when `rate.apply(money, 'EUR')`, then результат — `Money(3704, 'EUR')`, не нуль.
- [x] **AC-s1-4 (AC-03b):** Given випадкові пари (сума ≤ 10¹², курс ≤ 9 знаків), when `apply`, then відхилення від точного добутку ≤ 1 minor unit і округлення — half-up.

## Checklist (1 step ≈ 1 commit)

- [x] Step 1 — `src/shared/Rate.ts`: клас з приватним `nano: bigint`, `static ONE`, конструктор відкидає `nano <= 0n`.
- [x] Step 2 — `Rate.parse(s: string)`: регулярка ≤ 9 знаків після крапки, без експоненти й знака; `InvalidRateError` у тому ж файлі (shared не залежить від BC-помилок).
- [x] Step 3 — `toString()` завжди з 9 знаками після крапки (як приклади контракту); `toNano(): bigint` і `static fromNano(bigint)` для репозиторію (EXP-5).
- [x] Step 4 — `apply(money: Money, target: string): Money` — цілочисельно: `(amount × nano + 5·10⁸) / 10⁹`, результат через конструктор `Money`.
- [x] Step 5 — `src/shared/Rate.test.ts`: AC-s1-1..3 + property-тест AC-s1-4 під назвою з QG-1 `it('applies a rate with at most 1 minor unit of error (half-up)')`, без нових залежностей (детермінований генератор з seed).

## Edge cases

| Кейс | Поведінка |
|---|---|
| `"1e-7"` (так серіалізує JS number) | `InvalidRateError` — саме тому курс на дроті рядок (ADR-0002) |
| `"00.5"`, `".5"` | `InvalidRateError` — той самий `pattern`, що в схемі `Rate` контракту: ціла частина без провідних нулів, цифра перед крапкою обов'язкова |
| Курс < 10⁻⁹ | Не представний — `InvalidRateError`, accepted debt SAD §11 |
| Сума × курс > 2⁵³ | BigInt, переповнення немає; `Money` приймає результат лише як safe integer — інакше кидає |

## Definition of Done

- [x] `Rate.test.ts` зелений, включно з property-тестом AC-03b на ≥ 1000 пар
- [x] У `Rate.ts` немає жодного `Number(`/`parseFloat` на шляху курсу (grep у PR-описі)
- [x] `node_modules/.bin/tsc --noEmit` і `npx vitest run src/shared` зелені; dependency-guard мовчить (shared нічого не імпортує з BC)
- [x] `tracker.md`: SHR-1 → `done`

## Notes

<!-- Сюди виконавець пише причину `blocked` і домовленості, що виникли під час роботи. -->

- 2026-09-29 — реалізовано фоновою сесією (урок 7.5, [background/SHR-1-rate](../../../../background/SHR-1-rate/README.md)), коміт `54422bd`. Не `done`, бо рев'ю diff знайшло два відхилення, яких зонд не ловив:
  1. **Edge «Сума × курс > 2⁵³» не тримається.** `apply` повертає `new Money(+result.toString(), …)`, а `Money` перевіряє лише `Number.isInteger`, не `isSafeInteger` → `(2⁵³−1) × 3` дає `27021597764222972` замість `…973`, без помилки. Фікс: `Number.isSafeInteger` у `Money` (або перевірка в `apply`) + тест.
  2. **Ціла частина курсу без ліміту.** `PATTERN` = `(0|[1-9][0-9]*)`, у контракті — `[1-9][0-9]{0,8}` (≤ 9 цифр) → `Rate.parse("1234567890.5")` приймається, API його відкине. Фікс: `{0,8}` + рядок у `it.each`.
  - `Rate.test.ts` — майже дослівна копія зонду: DoD «тест зелений» виконано, але нового покриття юніт-тест не додав.
- 2026-09-29 — доробка (урок 7.6): isSafeInteger у Money, {0,8} у PATTERN.
- 2026-09-29 — друга доробка (2 зовнішнє рев'ю, 4 minor): xorshift32 замість LCG у property-тесті (мертві молодші біти ховали суми < 10⁶), межа 9 цифр цілої частини перенесена в конструктор Rate (fromNano більше не обходить її), коментар PATTERN вирівняно з кодом, явний `Number(resultAmount)` в `apply` з поясненням.
- 2026-09-29 — рецензент з чистого контексту, packet-3: WARN. Accepted debt (поза AC): генератор property-тесту не дає цілих курсів і впирається в cap 10¹² — дотягнути з EXP-5; `parse` без `typeof raw === 'string'` — закриває zod на дроті в HTTP-1; тест «PATTERN = схема Rate з openapi.yaml» — окрема дрібна story. Розбір: [review/SHR-1](../../../../review/SHR-1/verdict-3.md).
