---
type: generation
feature: multi-currency-summary
generated_by: task-forge
generated_at: 2026-09-29
stories_total: 15
waves: 6
gate_runs: 9
stage1: self-answered
review_cycles: 4
---

# Generation provenance — multi-currency-summary

Навіщо кожна story існує, звідки вона і чому в своїй хвилі — щоб нарізку можна було перевірити, не відкриваючи 15 файлів.

## Inputs read

- [PRD.md](../PRD.md) — §4 US-01..06, §5 AC-01..09 (10 id разом з AC-03b), §6 NFR, §6.1, §7 KPI, §8 OQ, §9.
- [sad.md](../sad.md) — §5 дельта файлів і міграцій, §6 Critical flow 1–3 з «Тестовим слідом», §8, §10 QG-1..3, §11.
- [adr/0001–0004](../adr/) — усі Accepted.
- [data-model.md](../data-model.md) — Entities, CHECK, Indexes, Domain ↔ columns, Promotion order, Roundtrip, Test fixtures; staged [migrations/](../migrations/) і [check-probes.sql](../check-probes.sql).
- [contracts/openapi.yaml](../contracts/openapi.yaml) — 5 `operationId`; [api-sync-report.md](../contracts/api-sync-report.md) — Error codes, Conflicts F1–F9, Closed open questions; `src/contracts/multi-currency-summary.fixtures.ts` — форма `rate` на дроті.
- Кореневий `CONTEXT.md`, `docs/features/trip-budget/CONTEXT.md`, `CLAUDE.md`, `.claude/rules/migrations.md`.
- Живий код: `src/presentation/app.ts`, `src/expenses/{domain,application,infrastructure,presentation}/*`, `src/trips/domain/Trip.ts`.
- Сусідній епік: [trip-budget/tasks/](../../trip-budget/tasks/tracker.md) (T0–T13, готовий `break-tasks` того ж дня) — `tasks.json` для `external_blocked_by` і story-файли T3, T5, T6, T8–T12, щоб знати, хто створює спільні файли.

## Stage 0 — CONTEXT.md

Файлу фічі не було → створено [CONTEXT.md](../CONTEXT.md) з п'ятьма секціями: 9 термінів з NOT-межами (4 з них уточнюють кореневий або trip-budget словник — rate snapshot, converted total, counted expense, base currency; SAD §11), 7 інваріантів з джерелами, 8 sentinel errors з api-sync-report, scope-filter з SAD §8, 5 пунктів out of scope. Back-port уточнень у чужі словники — не тут, а story DOC-1.

## Stage 1 — slicing proposal

> **Статус: `self-answered`.** AskUserQuestion у цьому прогоні не показувався: owner делегував Socratic-питання скілів («закривай рекомендованою опцією, рішення перелічи»). Тому таблиця нижче — мої відповіді як агента, а не Accept owner-а; першим пунктом handoff-у owner переглядає саме її.

Показаний наратив: «бачу 5 operationId (2 NEW, 3 CHANGED), 3 flows у §6, 10 AC, 17 нових і змінних файлів у дельті SAD §5, 2 staged-міграції; зовнішні блокери — stories trip-budget. Пропоную 14 stories у 6 хвилях: shared VO і міграція без блокерів, domain обох BC, use cases + репозиторії + адаптер зворотного порту, HTTP, E2E».

| Ітерація | Відповідь (хто) | Що змінилось |
|---|---|---|
| v1 — 14 stories, 6 хвиль | **Edit waves** (self) | Додано DOC-1: SAD §11 вимагає fix-term двох словників до реалізації, у v1 це ніде не жило. X-1 спробував підняти в W3 через фейк репозиторію — критик показав, що це відкривало HTTP-2 раніше за реалізацію `hasRatedExpenses` (див. Review), тож у v3 X-1 знову в W4 за EXP-5. |
| v2 — 15 stories, 6 хвиль | **Accept** (self) | — |
| v3 — після рев'ю, 15 stories, 6 хвиль | **Accept** (self) | EXP-1 стала L: інтерфейс + обидві реалізації `findById` + call-sites `TripBudgetPort` в одному PR; `hasRatedExpenses` — у EXP-5; ребра EXP-5 → X-1, HTTP-1; HTTP-2 — W5; `…140100` — у trip-budget T3; латентність — у HTTP-3. |

## Slicing rationale

| Prefix | BC / layer | Чому так |
|---|---|---|
| **SHR** | shared / domain | `Rate` — один VO, на якому стоять і збереження, і перерахунок; без залежностей → W1 |
| **MIG** | expenses / migration | Лише `…140000` (rate snapshot) — незалежна від ланцюжка `currency_code`; `…140100` (CHECK-и `trips`) мусить їхати одним деплоєм з trip-budget `…120000`, тому промотується в trip-budget T3 |
| **TRP** | trips / domain + application | Сутність з локом і use case розділені: TRP-1 не має блокерів в епіку, TRP-2 — має |
| **EXP** | expenses / domain → application → infrastructure | EXP-1 — зміна інтерфейсів разом з усіма реалізаціями й call-sites (інакше `tsc` червоний між stories); три use cases окремо — різні файли, паралельно; EXP-5 — мапінг BIGINT ↔ BigInt і `hasRatedExpenses` |
| **X** | cross / infrastructure | Адаптер зворотного порту — єдиний файл, де trips імпортує expenses; окрема story, щоб межу рев'ювили окремо |
| **HTTP** | http / presentation, wiring | На роутер + presenter-и (F4); зшивання `app.ts` — разом з маршрутами trips, бо лише вони споживають новий порт |
| **E2E** | http / e2e | Один сценарій на всю фічу — фіча S, три flows складаються в одну поїздку; латентність — не тут, а в `expenses.http.test.ts` (HTTP-3), як у SAD |
| **DOC** | cross / docs | Back-port уточнень словника, PRD §9 і документів trip-budget — робота з SAD §11 і ADR-0003/0004 «Негативні», яка інакше губиться |

## Coverage — PRD AC → stories

| AC | Stories |
|---|---|
| AC-01 | MIG-1, EXP-1, EXP-2, EXP-5, HTTP-1, E2E-1 |
| AC-02 | SHR-1, HTTP-1 |
| AC-03 | EXP-4, HTTP-3 |
| AC-03b | SHR-1, EXP-4, HTTP-3 |
| AC-04 | EXP-4, HTTP-3, E2E-1 |
| AC-05 | MIG-1, EXP-1, EXP-3, EXP-5, HTTP-1, E2E-1 |
| AC-06 | DOC-1, TRP-1, TRP-2, EXP-2, EXP-4, HTTP-2 |
| AC-07 | DOC-1, TRP-1, TRP-2, EXP-5, X-1, HTTP-2, E2E-1 |
| AC-08 | EXP-3, HTTP-1, E2E-1 |
| AC-09 | DOC-1, EXP-4, HTTP-3, E2E-1 |

**10/10**, сиріт немає (E2). NFR PRD §6: латентність підсумку — HTTP-3 (AC-h3-6), заміни курсу — HTTP-1 (Step 5); throughput ≥ 30 req/s і k6 — без story (CI немає, див. Deviations).

## Coverage — operationId → stories

| operationId | Stories |
|---|---|
| `createTrip` | TRP-2, HTTP-2, E2E-1 |
| `setTripBaseCurrency` | TRP-1, TRP-2, X-1, HTTP-2, E2E-1 |
| `addExpense` | EXP-1, EXP-2, EXP-5, HTTP-1, E2E-1 |
| `setExpenseRate` | SHR-1, EXP-1, EXP-3, EXP-5, HTTP-1, E2E-1 |
| `getTripSummary` | SHR-1, EXP-4, HTTP-3, E2E-1 |

**5/5** (E3).

## Gate log (Stage 2)

Вивід останнього прогону — в описі PR; тут — що впало і що змінено.

| Run | Story | Gate | Було | Fix |
|---|---|---|---|---|
| 1 | усі 15 | G9 | `./_epic.md: missing file` | Очікувано: епік пишеться у Stage 3 |
| 1 | HTTP-1 | G2 | `unresolved: мапінг — EXP-5` | Баг чекера: парсер масиву різав `"none: …, …"` по комі всередині лапок → елементи в лапках розбираються цілими |
| 1 | — | E4, E5, E7 | `tasks.json` / `tracker.md` / епік відсутні | Очікувано до Stage 3 |
| 2 | — | G6 | Оцінка токенів: «байти / 4» → «ASCII / 4 + решта / 2» | Для кирилиці результат той самий, зате правило явне |
| self-test | HTTP-3 (копія) | G1, G3, G5, G7, G9, G10 | 6 навмисних поломок | Спіймано 6/6; файл відновлено |
| 3–4 | — | E7 | `_generation.md` відсутній | Цей файл; `ALL GATES PASSED` |
| 5 | HTTP-1 | G13 (новий) | `API line: src/contracts/…gen.ts` | Токени-шляхи дозволені, але мусять існувати |
| 6 | HTTP-1 | G13 | `codes: http.ts` — ім'я файлу схоже на код `<bc>.<snake>` | Токени з розширенням файлу — не коди |
| 7 | усі 15 | — | 13/13, E1–E9 | `ALL GATES PASSED` |
| 8 | EXP-1, SHR-1 | G13 (посилений після рев’ю: цілі токени, поле — у `properties` своєї схеми) | `API line: null`, `pattern` — проза в бектиках | Прибрано бектики з не-імен |
| 9 | усі 15 | — | 13/13, E1–E9 | `ALL GATES PASSED` |

## Review (критик: цикл 1 — 38 знахідок, цикл 2 — 6, цикл 3 — 2, цикл 4 — 0)

Незалежний критик (окремий агент, чистий контекст) знайшов те, що гейти пропускали. Головне, що змінило нарізку:

| Знахідка | Було | Fix |
|---|---|---|
| HIGH — пропущене ребро | EXP-1 додавала методи в `ExpenseRepository`, реалізації — лише EXP-5 з `blocks: []`; `tsc` червоний між stories, HTTP-1/HTTP-2 могли стартувати до реалізації | `findById` з обома реалізаціями — в EXP-1; `hasRatedExpenses` — в EXP-5; EXP-5 блокує X-1 і HTTP-1 |
| HIGH — provenance | Stage 1 читався як Accept owner-а | Позначено `self-answered` (вище) |
| MEDIUM — форма на дроті | `rate` як `"0.0411"`, `path` масивом, `toJSON` у domain | 9 знаків (`"0.041100000"`), `path === "rate"`, presenter у HTTP-1 (F4) |
| MEDIUM — міжепічні файли | EXP-1 міняла `TripBudgetPort` без адаптера T5 і call-sites T6 у `files`; `…140100` не в тому деплої | Файли додано, external T6 + T8; `…140100` — у trip-budget T3 |
| MEDIUM — F1/F2 без власника | HTTP-stories асертили контракт цієї фічі, а спільні presenter-и trip-budget — інший | trip-budget T0 (contract-forge `--update`), від неї T10 → T12 → HTTP-1..3 |
| MEDIUM — чекер | `--story` з неіснуючим ID зелений, G10 ловив лише теговані фенси, G1 приймав будь-який підрядок, E5 не звіряв колонки | Виправлено + новий G13 (імена з контракту) і перевірка секцій/префікса в G8 |

**Цикл 2** — 6 знахідок: регрес EXP-5 (`toString()` без 9 знаків після правки SHR-1), T6 trip-budget не міг передати порт без зміни сигнатури роутера (перенесено разом з `app.ts` у T6), G13 приймав підрядки, суперечності SKILL.md про Stage 1 і фенси, команда перевірки CHECK-ів у T3, застарілі формулювання хвиль і днів. Усі закрито. **Цикл 3** — 2 LOW: `hasField` у G13 приймав вкладені ключі (`Expense.description`) — тепер лише ключі рівня `properties`; T12 trip-budget дублював зшивання, яке вже робить T6. **Цикл 4** — no open findings.

Решта циклу 1 — формулювання AC, імена тестів з тестового сліду, словник (`rate backfill` → «дозаповнення курсу», NOT міграційний backfill), неточності цього файлу.

Спіймано не скриптом, а при написанні:

| Story | Що було | Fix |
|---|---|---|
| TRP-1 | Метод порту `hasExplicitRates` — ADR-0004 називає його `hasRatedExpenses` | Перейменовано. Імена портів/класів з ADR — кандидат у G14 |
| TRP-1 | Edge case приписував ADR-0004 поведінку, якої там немає (відкритий F8) | Переписано: поведінка SAD + open question |
| EXP-1 | «Нова фабрика `anExpense`» — її створює trip-budget T5 | «Розширити фабрику з T5» |

## Open questions surfaced during slicing

- **F8 (api-sync-report) — лок base currency поки задано budget.** Зараз зміна валюти при budget дозволена і `50 000 EUR` мовчки стає `50 000 CZK`. Рекомендація звіту — Amendment ADR-0004 (той самий 409). Зачіпає TRP-1, TRP-2, HTTP-2; вирішити до старту TRP-1.
- **Явний курс на витраті у base currency.** Upstream вирішує лише `rate: null` для таких витрат (F3); явний `0.9` на EUR-витраті в EUR-поїздці спотворив би total і тримав би лок AC-07. Варіанти: відхиляти (422) або ігнорувати; до рішення EXP-2 / EXP-3 / HTTP-1 окремої гілки не мають.
- **Два контракти на одні ендпойнти (F1/F2).** trip-budget (api-forge: snake_case, `/api/v1`, Bearer) проти цієї фічі (contract-forge: camelCase, `X-API-Key`). Власник — trip-budget T0; HTTP-stories тут стоять після неї через T12.
- **Lane `PostgresExpenseRepository.ts` між епіками.** trip-budget T7–T9 і EXP-1 / EXP-5 правлять один файл: EXP-1 — після T8, T9 ребейзиться на EXP-5 (записано в Notes T9). E8 бачить lanes лише всередині епіку.
- **Годинник у use cases** (`rateSetAt = now`) — у коді немає спільного `Clock`; EXP-2/EXP-3 беруть той спосіб, що вже є в тестах, або вводять порт. Вирішиться на EXP-2.

## Deviations from upstream

- SAD §5 називає міграцію `migrations/0004_add_expense_rate.sql`; data-model (пізніша стадія) — дві staged-міграції з 17-значним префіксом. MIG-1 і trip-budget T3 ідуть за data-model.
- PRD §9 обіцяв backfill курсу 1 — не робимо (ADR-0003), back-port у DOC-1.
- `ExpenseRepository.hasRatedExpenses` — моє рішення, як адаптер X-1 отримує факт «є явні курси»: SAD каже «поверх `ExpenseRepository`», data-model описує `EXISTS`-запит, окремого методу ніхто не назвав.
- `src/expenses/infrastructure/expenseRow.ts` і `expensePresenter.ts` — нових файлів немає в дельті SAD; перший — щоб перевірити BIGINT ↔ BigInt без БД, другий — рекомендація F4.
- eslint `import/no-restricted-paths` (SAD §11: «підключити разом із цією фічею») — не нарізано: це тулінг репо; межу BC тримає dependency-guard trip-kit (domain/application) + рев'ю X-1. Кандидат у trip-kit.
- Throughput ≥ 30 req/s і k6 smoke (PRD §6) — без story: CI в репо немає; локально — лише таймінги supertest у HTTP-1 / HTTP-3.
