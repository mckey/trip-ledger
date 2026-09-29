---
name: contract-forge
description: >
  Мій форк sdlc:api-forge: OpenAPI 3.1 контракт фічі під мою практику —
  brownfield-дріт з живих роутерів як джерело конвенцій, value objects з shared/
  на дроті, коди помилок з імен доменних sentinel-класів, десяткові величини
  рядком, codegen openapi-typescript + типізовані моки під tsc, drift check на
  7 пунктів (+ Invariants, + wire diff проти живого коду). Тригери:
  «contract-forge <slug>», «контракт для <slug>», «openapi для <slug>»,
  «/contract-forge <slug> [--update]». Пише docs/features/<slug>/contracts/
  openapi.yaml + api-sync-report.md, src/contracts/<slug>.gen.ts і .fixtures.ts.
  Standalone.
---

# Skill: contract-forge — API-контракт під мою практику

Той самий конвеєр, що в `sdlc:api-forge` (prereq → сценарій A/B → джерела → стиль → шаблони → ендпойнти з AC → помилки з `alt`-гілок → error model → ідемпотентність → пагінація → події → приклади → lint → mock → drift + звіт → DoD → коміт), але дефолти, джерела і перевірки переписані під те, як реально влаштовані мої репо: Node + Express 5 + zod на межі presentation, Clean Architecture з портами між BC, гроші лише цілими minor units через value objects у `shared/`, один клієнт (я), API вже живе і має споживача — тести й скрипти.

## Відмінності від готового api-forge (навіщо форк)

1. **Живий дріт — джерело конвенцій, а не дефолти курсу.** Перед генерацією — wire scan: `src/*/presentation/*Router.ts` (шляхи, zod-схеми, `res.status().json(...)`), `*.http.test.ts` (що реально перевіряється), серіалізація доменних класів. Звідти беруться регістр ключів (camelCase), префікс шляхів (немає), форма наявних відповідей. Готовий скіл на trip-budget застосував snake_case і `/api/v1` до API, що живе на camelCase без префікса, — і breaking change виріс ширшим за той, що вирішили ADR (там — лише форма відповіді). Тут breaking change буває лише один: той, що записаний в ADR або явно прийнятий у звіті.
2. **Value objects на дроті — своїми публічними полями.** `Money` → `{amount, currency}` (`amount` — ціле, minor units, ≥ 0), `Balance` → те саме зі знаком, `Rate` → десятковий рядок. Схема називається як VO, origin поля — VO у `shared/` + колонка з `data-model.md`. Готовий скіл розкладає все на колонки (`budget_minor`, `remaining_minor`) і втрачає тип: клієнт не бачить, що `remaining` і `budget` — одна валюта за побудовою.
3. **Десяткові — рядком, ніколи JSON number.** Курс `"0.000037037"` з `pattern` на ≤ 9 знаків. JSON number пройде через float: `String(0.0000001) === "1e-7"`, і `Rate.parse` зламається на валідному вводі. Гроші — лише `type: integer` у minor units. Будь-яке `type: number` на гроші/курс — ban-list.
4. **Коди помилок виводяться з імен sentinel-класів механічно.** `code = <bc>.<snake(ClassName без Error)>`, `bc ∈ trips | expenses | shared | http` (той самий набір, що в іменах ADR у arch-forge): `TripNotAcceptingExpensesError` у `expenses` → `expenses.trip_not_accepting_expenses`, zod → `http.validation_failed`, API-key → `http.unauthorized`. Check 2 стає grep-ом, а не ручною звіркою. Мої SAD називають sentinel-класи прямо в `alt`-гілках flows — мапінг гілка → код теж механічний.
5. **На дріт іде лише те, що читає flow.** Колонка з `data-model.md`, яку жоден flow не віддає клієнту (`rate_set_at` для KPI), — `intentionally internal` у check 4, а не поле з `# unused-in-prd`. Готовий скіл тягне у відповідь кожну колонку.
6. **Auth, пагінація, ID — з реальності single-user brownfield.** `ApiKeyAuth` (header `X-API-Key`, ключ з `API_KEY`), 401 до будь-якого читання сховища. Обмежені колекції (SAD §7: ≤ 300 витрат на поїздку) — без пагінації, межа як `maxItems` з origin; коли треба — keyset по `(spent_at, id)`: legacy ID — UUID v4, курсор на UUID v7 у brownfield неможливий. Версія — `info.version` + CHANGELOG, без `/api/v1`, поки клієнт один.
7. **Codegen — конкретна команда і гейт.** `node scripts/contracts.mjs gen <slug>` → `src/contracts/<slug>.gen.ts` (openapi-typescript 7.13, `alphabetize`), `src/contracts/<slug>.fixtures.ts` — моки кожної операції через `satisfies`, гейт — `tsc --noEmit`. Тулчейн ізольований у `tools/codegen/`: openapi-typescript будує AST через JS compiler API (`ts.factory`), якого немає в нативному TypeScript 7 кореневого проєкту, а `overrides` не допомагає — npm піднімає peer у корінь. Lint — spectral `--fail-severity warn`.
8. **Drift check — 7 пунктів.** П'ять з готового + **6 Invariants** (кожен інваріант `CONTEXT.md` має відбиток у контракті: «budget не блокує» ⇒ жодного 4xx на overspend) + **7 Wire diff** (для кожного CHANGED-ендпойнта — таблиця змін запиту / відповіді / помилок проти живого роутера; кожна зміна — з ADR або з рішенням у звіті, інакше blocker). Core — 1, 2, 3, 6, 7.
9. **Accepted ADR і SAD §5 «Контракти» > дефолти.** Якщо ADR/SAD назвав форму (`{ expense, budget }`, `converted: { total, withoutRate } | null`) — контракт повторює її дослівно, з camelCase-іменами із SAD. Контракт сусідньої фічі на той самий ендпойнт — теж вхід: розширювати, не перевизначати; сусід на інших дефолтах — flag з пропозицією перегнати його цим скілом.
10. **Відкриті питання PRD з due «стадія API contracts» закриваються тут** — таблиця «Closed open questions» у звіті з відповіддю і джерелом. ≥ 3 flags — пауза, але рекомендована опція пропонується одразу. Українською; коміт у наскрізному ряду: `05: API contract for <slug> via contract-forge`.

## Owner

Автор фічі як backend lead. Споживач контракту — я сам (скрипти, HTTP-тести), тож reviewer — теж я, але з таблицею wire diff перед очима.

## When to use

- «contract-forge <slug>», «контракт для <slug>» — після data-model (сценарій A) або після SAD, якщо моделі ще немає (сценарій B).
- `--update` — джерела змінились (data-model, ADR, SAD §6): перечитати, оновити YAML на місці, `info.version` не чіпати, дописати run у журнал звіту.
- `--reconcile` — з'явився `data-model.md` після сценарію B: як у готовому скілі.
- Skip, якщо `openapi.yaml` є, lint зелений, core checks ✓ і `tsc --noEmit` зелений на моках.

## Inputs

**Hard required:** `docs/features/<slug>/PRD.md` (§4, §5, §6.1, §8); `docs/features/<slug>/sad.md` (§5 «Контракти» і дельта файлів, §6 flows, §8 Error handling / Validation / Access boundary); кореневий `CONTEXT.md` (Invariants); живі `src/*/presentation/*Router.ts`. Без SAD — стоп: у моїх репо форми відповідей вирішуються в SAD/ADR, не в PRD.

**Recommended:** `docs/features/<slug>/data-model.md` (є → сценарій A); `adr/*.md`.

**Optional:** `docs/features/*/contracts/openapi.yaml` сусідніх фіч, що чіпають ті самі ендпойнти; `idea-brief.md` (→ `info.description`); `src/shared/*.ts` (поля VO).

## Defaults (моя house style)

Baseline — [`./templates/rules-openapi-baseline.md`](./templates/rules-openapi-baseline.md) → `.claude/rules/openapi.md`.

| Тема | Default | Чому |
|---|---|---|
| OpenAPI | `3.1.0`, nullable — `oneOf: [$ref, {type: "null"}]` / `type: [T, "null"]` | Як у курсі |
| Регістр ключів | camelCase — як живий дріт і TS-домен | Одна назва поля від домену до JSON; без мапінгу в presenter |
| Шляхи | як у роутерах, без версії в URL; новий ендпойнт — ресурсний шлях за сигнатурою use case (`SetExpenseRate(expenseId)` → `/expenses/{expenseId}/rate`) | Один клієнт; не вигадувати параметр, якого use case не приймає |
| Помилка | `{code, message, details?}`; `details.issues[] = {path, message}` з zod | Як у курсі + конкретна форма `details` замість голого `object` |
| `code` | `<bc>.<snake(Sentinel)>`, bc ∈ trips / expenses / shared / http | Механічна перевірка (п. 4) |
| Статуси | відсутність 404 · state-відмова 409 · правило даних 422 (zod і доменні) · auth 401 | Конвенція репо (SAD §8) |
| Гроші | `Money {amount: integer ≥ 0, currency}`, `Balance {amount: integer, currency}` | Дзеркало `shared/` |
| Курс / десяткові | рядок з `pattern`, межа знаків — з ADR | п. 3 |
| Валюта | `pattern ^[A-Z]{3}$`, `minLength/maxLength: 3` | SAD §8: патерн замість довідника |
| Auth | `ApiKeyAuth`, header `X-API-Key`, глобально | SAD §8, single-user |
| Пагінація | немає для обмежених колекцій (`maxItems` з origin); keyset `(spent_at, id)` коли треба | п. 6 |
| Ідемпотентність | PUT для заміни атрибута (ідемпотентний сам); `Idempotency-Key` — лише якщо flow має retry | Жодного retry у sync-flows |
| Схеми | лише `$ref`; `additionalProperties: false` на кожному об'єкті | Як у курсі, строгіше |
| Приклади | на кожну операцію request + success + кожен error-код; PII — `Test Trip`, UUID `00000000-0000-4000-8000-…` | Як у курсі |
| Ban-list | inline-схеми в `paths`; `nullable: true`; `additionalProperties: true`; `type: object` без `properties`; `type: number` на гроші/курс; реальні PII у `example` | п. 3 + урок про `metadata: object` |

## Protocol

1. **Prereq (hard).** Файли з Inputs є. Сценарій: A, якщо `data-model.md` є, інакше B.
2. **Rules bootstrap.** Немає `.claude/rules/openapi.md` → копія baseline. Є, але з маркером `api-forge` → показати різницю з моїм baseline, спитати `Replace / Merge / Keep` (рекомендація — Replace); контракти фіч, згенеровані під старі правила, перелічити у звіті як flag.
3. **Wire scan.** Для кожного ендпойнта, який фіча змінює, — as-built таблиця: шлях, zod-схема запиту, форма відповіді (з урахуванням серіалізації класів: `res.json(domainObject)` віддає всі публічні поля, включно з VO як вкладені об'єкти), статуси й тіла помилок. Це база для check 7.
4. **Джерела в порядку пріоритету:** Accepted ADR → SAD §5 «Контракти» → SAD §6 flows (гілки `alt`, імена sentinel-ів) → SAD §8 → PRD §5 AC (валідація) і §6.1 → `data-model.md` (типи, межі) → `shared/` VO → контракти сусідніх фіч → живий дріт (п. 3).
5. **Scope.** Таблиця ендпойнтів NEW / CHANGED з джерелом. Ендпойнт без AC чи рядка SAD — не додається.
6. **Схеми.** Для кожного поля — origin: колонка (`high`), VO (`high`), ADR/SAD-форма (`medium`), PRD-текст (`medium`), ім'я повідомлення у flow (`low`). Поле без origin — стоп і питання (never invent). Колонка без читання у flow — `intentionally internal`.
7. **Помилки.** Кожна `alt`-гілка flow → відповідь; код — за п. 4; sentinel-ів, яких ще немає в коді, але названих у SAD §5, — з позначкою `planned`. Гілка, якої немає у flow, але є в живому роутері (наприклад, 404 на відсутню поїздку) — з origin «as-built» і flag, якщо flow її не показує.
8. **Числа і валюти** за п. 2–3; межі — з DDL (`INTEGER` → `maximum: 2147483647`) і ADR (знаки курсу).
9. **Події.** Лише якщо flow має async-учасника; інакше `events.md` не створюється, і звіт так і пише.
10. **Приклади** — на кожну операцію і кожен код помилки (named `examples`).
11. **YAML** з [`./templates/openapi.yaml`](./templates/openapi.yaml) → `docs/features/<slug>/contracts/openapi.yaml`.
12. **Lint:** `node scripts/contracts.mjs lint <slug>` (скрипта немає — з [`./templates/contracts.mjs`](./templates/contracts.mjs); `tools/codegen/` — `openapi-typescript@7.13.0`, `typescript@5.9.3`, `@stoplight/spectral-cli`).
13. **Codegen + моки:** `node scripts/contracts.mjs gen <slug>`; `src/contracts/<slug>.fixtures.ts` з [`./templates/fixtures.ts`](./templates/fixtures.ts) — по одному моку на кожну success-відповідь і на `budget: null`-подібні гілки; `./node_modules/.bin/tsc --noEmit -p .` зелений.
14. **Drift check (7) + звіт** з [`./templates/api-sync-report.md`](./templates/api-sync-report.md): field origins, error catalogue, checks 1–7, unresolved origins, deviations, conflicts, closed open questions, wire diff.
15. **Self-check (DoD)** — нижче. Будь-який ✗ у core — виправити або показати, без коміту.
16. **Коміт** `05: API contract for <slug> via contract-forge` (+ окремим комітом — зміни в `tools/` / `scripts/`, якщо були) і handoff: що переглянути, які flags чекають рішення, далі — tasks.

## Drift check

| # | Check | Core? | ✗ означає |
|---|---|---|---|
| 1 | Endpoint ↔ data-model: кожен ендпойнт → запит/мутація по сутності | core | ендпойнт без даних або дані без запиту |
| 2 | Error codes ↔ sentinels: `grep "class <Name>Error"` для кожного коду; `planned` — лише якщо клас названий у SAD §5 | core | код без класу або клас без коду |
| 3 | Validation ↔ DB / ADR: межі, `pattern`, `enum` не слабші за DDL і ADR | core | контракт пропускає те, що впаде в БД |
| 4 | Entity ↔ endpoint: кожна нова колонка на дроті або `intentionally internal` з причиною | supporting | колонка без рішення |
| 5 | OpenAPI ↔ sequence: кожна `alt`-гілка має відповідь, кожна відповідь — гілку або as-built origin | supporting | розійшлися flow і контракт |
| 6 | Invariants: кожен інваріант `CONTEXT.md`, який чіпає фіча, має відбиток у контракті | core | контракт дозволяє порушити інваріант (або забороняє те, що інваріант дозволяє) |
| 7 | Wire diff: кожна зміна CHANGED-ендпойнта проти as-built — з ADR або рішенням у звіті | core | недекларований breaking change |

## Definition of Done

- `openapi.yaml` + `api-sync-report.md` у `docs/features/<slug>/contracts/`; сценарій записаний; `unresolved_origins` порожній (A) або перелічений (B).
- Lint 0 problems; `tsc --noEmit` зелений з моками всіх success-відповідей.
- Core checks 1, 2, 3, 6, 7 ✓; кожен flag має рішення або власника.
- Відкриті питання PRD з due на цю стадію закриті в таблиці.

## Anti-patterns

- **Дефолти курсу поверх живого API** — snake_case і `/api/v1` там, де клієнт уже говорить camelCase без префікса.
- **Розкласти VO на колонки** (`remaining_minor`, `base_currency`) і втратити, що це одні гроші.
- **Курс JSON-числом.**
- **Код помилки «з голови»**, а не з імені класу — через місяць `trip.not_found` і `TripDoesNotExistError` живуть окремо.
- **Колонка на дріт «бо є в моделі».**
- **`details: {type: object}`** — невидимий контракт (урок про `metadata: object`).
- **Моки без `satisfies`** — codegen є, а розходження все одно ловить стенд.
- **Drift check «контракт щойно згенеровано, звісно збігається».**

## Templates

- [`./templates/openapi.yaml`](./templates/openapi.yaml) — каркас: ApiKeyAuth, `Money` / `Balance` / `CurrencyCode` / `Rate`, `ErrorResponse` з `details.issues`, типові відповіді 401/404/409/422.
- [`./templates/api-sync-report.md`](./templates/api-sync-report.md) — структура звіту з checks 1–7, wire diff і closed open questions.
- [`./templates/events.md`](./templates/events.md) — async-події (лише якщо flow має async-учасника).
- [`./templates/rules-openapi-baseline.md`](./templates/rules-openapi-baseline.md) — мій baseline `.claude/rules/openapi.md`.
- [`./templates/contracts.mjs`](./templates/contracts.mjs) — `gen` / `lint` для репо, де скрипта ще немає.
- [`./templates/fixtures.ts`](./templates/fixtures.ts) — типізовані моки через `satisfies`.
