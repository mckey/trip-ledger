---
id: T1
title: "Додати знаковий value object Balance у src/shared"
layer: "domain"
deps: []
acs: ["AC-03b"]
files_hint: ["src/shared/Balance.ts", "src/shared/Balance.test.ts"]
owner: "Vladimir Makarov"
estimate: "S"
status: "todo"
---

# T1 — Додати знаковий value object Balance у src/shared

## Why

Remaining може бути від'ємним ([PRD §AC-03b](../PRD.md)), а `Money` за інваріантом невід'ємний. Рішення — окремий знаковий тип у `shared/`, `Money` не послаблюємо: [ADR-0004](../adr/0004-signed-balance-value-object-in-shared.md), [sad §5](../sad.md), [sad §10 QG-1](../sad.md).

## What

- `src/shared/Balance.ts` — знакове ціле в мінорних одиницях + валюта; API за [sad §5](../sad.md) (`of(Money)`, `minus(Money)` з перевіркою валюти, `isNegative()`).
- `src/shared/Balance.test.ts` — юніт-тести + property-тест на цілочислову арифметику (сценарій [sad §10 QG-1](../sad.md)).
- `Money.ts` не змінюється.

## Definition of Done

- [ ] `npx vitest run src/shared/Balance.test.ts` зелений: від'ємний результат зберігає знак, різні валюти в `minus()` кидають помилку, нецілі значення відкидаються.
- [ ] Property-тест на випадкових цілих: `Balance.of(a).minus(b).amount === a.amount - b.amount` без похибки.
- [ ] `src/shared/Money.ts` і `src/shared/Money.test.ts` без змін, `npx vitest run` зелений.
- [ ] `npx tsc --noEmit` чистий.

## Notes

- `shared/` — без бізнес-логіки контекстів (CLAUDE.md): `Balance` не знає про поїздки й бюджети.
- Паралельна гілка: не залежить ні від чого, стартує разом з T2.
