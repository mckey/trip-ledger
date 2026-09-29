---
paths:
  - "docs/features/*/contracts/**"
  - "src/contracts/**"
---

# OpenAPI rules

<!-- Baseline: contract-forge (мій форк sdlc:api-forge). Відхилення фічі — у її
contracts/api-sync-report.md, розділ «Deviations», свідомо, не мовчки. -->

## Дріт

- camelCase — як живі роутери й TS-домен. Шляхи — як у роутерах, без версії в URL, поки клієнт один; версія — `info.version` + CHANGELOG.
- Наявний ендпойнт описується as-built (включно з тим, як серіалізуються доменні класи); змінюється лише те, що вирішив ADR або явне рішення у звіті.
- Новий ендпойнт — ресурсний шлях за сигнатурою use case; параметра, якого use case не приймає, у шляху немає.
- Метод: PUT для заміни атрибута (ідемпотентний сам), POST для створення. `Idempotency-Key` — лише якщо flow має retry.

## Типи

- Гроші — `Money {amount: integer ≥ 0, currency}`; знакові — `Balance {amount: integer, currency}`. Лише minor units.
- Десяткові (курс) — рядок з `pattern` і межею знаків з ADR. `type: number` на гроші/курс заборонено.
- Валюта — `^[A-Z]{3}$`, довжина 3. ID — `format: uuid` (legacy UUID v4).
- Межі — не слабші за DDL (`INTEGER` → `maximum: 2147483647` на полях запиту) і ADR. `Money` у відповіді буває сумою — межа `9007199254740991` (JS safe integer).
- Nullable — `oneOf: [$ref, {type: "null"}]` або `type: [T, "null"]`.

## Помилки

- `{code, message, details?}`; `details.issues[] = {path, message}` з zod.
- `code = <bc>.<snake(ClassName без Error)>`, bc ∈ `trips | expenses | shared | http`. zod → `http.validation_failed`, API-key → `http.unauthorized`.
- Статуси: відсутність 404 · state-відмова 409 · правило даних (zod і доменне) 422 · auth 401.

## Доступ

- `ApiKeyAuth` (header `X-API-Key`, `API_KEY`) глобально; перевірка до будь-якого читання сховища, 401 однаковий для наявного й неіснуючого ресурсу.

## Колекції

- Обмежена колекція (SAD §7) — без пагінації, межа як `maxItems` з origin.
- Необмежена — keyset `(spent_at | created_at, id)`, `?after=&limit=`; offset заборонено. Курсор на UUID v7 — лише для нових таблиць з v7.

## Схеми

- Лише `$ref`; `additionalProperties: false` на кожному об'єкті; `type: object` без `properties` заборонено.
- Приклади на кожну операцію і кожен код помилки; PII — `Test Trip`, UUID `00000000-0000-4000-8000-…`.

## Інструменти

- `node scripts/contracts.mjs lint [slug]` — spectral `spectral:oas`, `--fail-severity warn`.
- `node scripts/contracts.mjs gen [slug]` → `src/contracts/<slug>.gen.ts` (генерований, не редагувати) + моки `src/contracts/<slug>.fixtures.ts` через `satisfies`; гейт — `tsc --noEmit`.
- Тулчейн — `tools/codegen/` (`npm --prefix tools/codegen ci`): openapi-typescript потребує TypeScript 5 JS API, кореневий TS 7 його не має.
