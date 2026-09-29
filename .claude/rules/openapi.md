---
paths:
  - "docs/features/*/contracts/**"
---

# OpenAPI defaults (baseline)

<!-- Baseline створено першим прогоном api-forge (sdlc plugin) 2026-09-29 на trip-budget.
Це дефолти курсу, не нейтральний OpenAPI. Кожне відхилення фічі від них фіксується
в її contracts/api-sync-report.md (розділ «Deviations from defaults») — свідомо, не мовчки. -->

| Тема | Дефолт |
|---|---|
| Версія OpenAPI | `3.1.0` (JSON Schema 2020-12; nullable лише як `type: [T, "null"]`) |
| Формат помилки | `{code, message, details?}`, ключі snake_case |
| Namespacing `code` | `<module>.<error_name>`, snake_case (`trip.not_found`) |
| Пагінація списків | cursor (`?after=&limit=`), курсор — UUID v7; offset заборонено |
| Версіонування | у URL: `/api/v1/...`; `?v=2` заборонено |
| Автентифікація | `BearerAuth` (`http`, `bearer`) глобально; публічний ендпойнт — явний `security: []` |
| ID | UUID v7 генерується в застосунку, не в БД |
| Валідація | `pattern` / `enum` / `maxLength` / `minimum`/`maximum` обов'язкові для обмежених полів |
| Схеми | лише `$ref`; inline-схеми в `paths` заборонені |
| Ідемпотентність | `Idempotency-Key` на mutating + retriable POST/PATCH |
| Приклади | на кожну операцію: request + success + error; лише плейсхолдери (`Test Trip`, `<...>@example.test`) |

## Заборонено

- `nullable: true` (стиль 3.0).
- Реальні PII у `example`.
- `additionalProperties: true` на схемах відповідей.
- Помилка вільним текстом (`{"error": "..."}`).
