---
id: T0
title: "Узгодити контракт trip-budget з живим дротом: прогін contract-forge --update (F1/F2)"
layer: "docs"
deps: []
acs: ["AC-01", "AC-03", "AC-08"]
files_hint: ["docs/features/trip-budget/contracts/openapi.yaml", "docs/features/trip-budget/contracts/api-sync-report.md", "src/contracts/trip-budget.gen.ts", "src/contracts/trip-budget.fixtures.ts"]
owner: "Vladimir Makarov"
estimate: "M"
status: "todo"
---

# T0 — Узгодити контракт trip-budget з живим дротом: прогін contract-forge --update (F1/F2)

## Why

Flag F2 в [api-sync-report](../contracts/api-sync-report.md): контракт, згенерований готовим `api-forge`, описує snake_case, префікс `/api/v1`, `{code, message}` і Bearer, а живі роутери — camelCase без префікса з `{error}`. Контракт сусідньої фічі multi-currency-summary на ті самі ендпойнти вже зроблено `contract-forge` за живим дротом (camelCase, `X-API-Key`). Поки це не узгоджено, T10–T12 реалізовували б форму, яку одразу доведеться переписати.

## What

- Прогін `contract-forge trip-budget --update`: регістр ключів, шляхи, форма помилок і схема автентифікації — за живим дротом і контрактом multi-currency-summary; breaking change лишається лише той, що в ADR-0003 (envelope).
- `node scripts/contracts.mjs gen trip-budget` → оновлені `src/contracts/trip-budget.gen.ts` і моки `trip-budget.fixtures.ts`.
- Рядок у run log звіту; F1/F2 → `resolved` з посиланням на цей прогін.

## Definition of Done

- [ ] `node scripts/contracts.mjs lint trip-budget` — 0 problems; `node_modules/.bin/tsc --noEmit` зелений на оновлених моках.
- [ ] Ендпойнти, спільні з multi-currency-summary (`addExpense`, `getTripSummary`), мають однакові регістр, шляхи, форму помилок і `X-API-Key` в обох контрактах.
- [ ] api-sync-report: F1/F2 закриті, run log доповнено.

## Notes

- Задача рішення, а не коду: блокує T10 (а через неї T11–T13). Згенеровано не готовим `break-tasks` — додано на рев'ю, бо скіл не має способу виразити невирішений upstream-flag як залежність.
