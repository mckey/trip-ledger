---
id: T3
title: "Промотувати міграцію budget на trips і змапити колонки в PostgresTripRepository"
layer: "migration"
deps: ["T2"]
acs: ["AC-01", "AC-07"]
files_hint: ["docs/features/trip-budget/migrations/20260928120000_add_budget_to_trips.up.sql", "docs/features/trip-budget/migrations/20260928120000_add_budget_to_trips.down.sql", "docs/features/multi-currency-summary/migrations/20260928140100000_add_budget_checks_to_trips.sql", "src/trips/infrastructure/PostgresTripRepository.ts"]
owner: "Vladimir Makarov"
estimate: "M"
status: "todo"
---

# T3 — Промотувати міграцію budget на trips і змапити колонки в PostgresTripRepository

## Why

Budget і base currency зберігаються колонками на `trips` ([ADR-0001](../adr/0001-budget-as-columns-on-trips.md), [data-model.md](../data-model.md) §`trips`). Без збереження AC-01 («система зберігає budget») і AC-07 («заміна перезаписує значення») не виконуються на реальній БД: [PRD §AC-01](../PRD.md), [PRD §AC-07](../PRD.md).

## What

- Staged-пара [`../migrations/20260928120000_add_budget_to_trips.up.sql`](../migrations/20260928120000_add_budget_to_trips.up.sql) + `.down.sql` — `implement-tasks` промотує її в живий `migrations/`.
- `src/trips/infrastructure/PostgresTripRepository.ts` — `TripRow` + `save()` (upsert пише `budget_minor`, `base_currency`, `budget_set_at`) + `toDomain()` (nullable → `undefined`).

## Definition of Done

- [ ] Staged-міграція промотована в живий `migrations/`, застосовується і відкочується чисто: `scripts/db-roundtrip.sh docs/features/trip-budget/migrations` (up → down → up) зелений.
- [ ] `…140100000_add_budget_checks_to_trips` промотована в тому ж PR після `…120000`; перевірка: свіжа БД, `npx node-pg-migrate up`, дві проби `trips_budget_*` з `docs/features/multi-currency-summary/check-probes.sql` вручну падають на своїх CHECK (решта проб — про `rate_nano`, це MIG-1 multi-currency-summary).
- [ ] Після up: `save()` поїздки з budget і `findById()` повертають ті самі `budget`, `baseCurrency`, `budgetSetAt`; поїздка без budget читається з `budget === undefined`.
- [ ] Наявні рядки `trips` без budget читаються без помилок (expand-only).
- [ ] `npx tsc --noEmit` чистий, `npx vitest run` зелений.

## Notes

- **Формат раннера.** Staged-файли — пари golang-migrate (`.up.sql` / `.down.sql`), а живий раннер — node-pg-migrate з одним файлом і секціями `-- Up Migration` / `-- Down Migration` та перештампованим префіксом ([.claude/rules/migrations.md](../../../../.claude/rules/migrations.md)). Промоція = конвертація формату, не копіювання.
- **Той самий деплой, що й CHECK-и з multi-currency-summary** — `…140100000_add_budget_checks_to_trips.sql` промотується тут, одразу після `…120000` ([data-model mcs · Promotion order](../../multi-currency-summary/data-model.md#promotion-order) п. 3, [ADR-0001 Amendment](../adr/0001-budget-as-columns-on-trips.md)): колонки budget не живуть у проді без CHECK. Файл належить іншій фічі, але в її епіку окремої story для нього немає (MIG-1 там промотує лише `…140000`). Рішення прийнято на рев'ю нарізки.
- Lane `migration` серіалізований: T3 іде перед T7 (порядок префіксів 120000 → 120100).
- `InMemoryTripRepository` зберігає об'єкти `Trip` цілком — змін не потребує.
