---
status: Draft
owner: "Vladimir Makarov"
reviewers: []
updated_at: "2026-09-02"
feature_size: S
stage: "03"
ticket: "-"
---

# Software Architecture Document — multi-currency-summary

<!-- arch-forge: 12 секцій arc42. Порожня секція — лише як <!-- N/A: причина --> (§7 має фіксований текст нижче). -->
<!-- C4 Context (L1) — inline у §3; C4 Container (L2) — inline у §5; L3/L4 не малюємо. -->
<!-- Джерела за пріоритетом: кореневий CONTEXT.md (Glossary + Invariants) → PRD → Explore-звіт → рішення попередніх секцій. -->
<!-- Заповнені приклади: docs/features/trip-budget/sad.md (курсовий скіл), docs/features/<наступна>/sad.md (цей скіл). -->

## 1. Introduction and goals

**Intent.** multi-currency-summary робить підсумок поїздки чесним для 2–3 валют: на витраті в чужій валюті owner може зафіксувати `rate snapshot` — курс до `base currency`, записаний один раз і більше не оновлюваний; підсумок показує `converted total` у base currency **поруч** із сирими сумами по валютах і лічильник витрат без курсу. Витрата з курсом входить у порівняння з `budget` — залишок із trip-budget перестає брехати на мультивалютних поїздках (PRD AC-09). Це Approach C з idea-brief §13 (RICE 7): жодних зовнішніх джерел курсів, жодних історичних довідників.

Brownfield: розширює BC `expenses` (атрибут витрати, новий use case, агрегат підсумку) і `shared` (арифметика курсу); торкається BC `trips` через правило незмінності base currency (AC-07). Спирається на прийняту архітектуру сусідньої фічі: [[../trip-budget/sad.md]] — `BudgetBlock` і `TripBudgetPort` (її ADR-0002), `Balance` (ADR-0004), `base_currency` на `trips` (ADR-0001).

**Top-3 quality goals (1-liners; сценарії у §10; терміни у §12):**

1. **QG-1 Точність перерахунку — похибка ≤ 1 minor unit на витрату.** Цілочислова арифметика у minor units з фіксованим правилом округлення half-up; плаваюча точка заборонена (PRD §6 NFR «Точність перерахунку»).
2. **QG-2 Латентність існуючих ендпойнтів не деградує.** Підсумок з converted total — p95 ≤ 250 ms; збереження/правка курсу — p95 ≤ 150 ms; ≥ 30 req/s на 1 інстанс (PRD §6 NFR).
3. **QG-3 Інваріанти словника тримаються у типах, не в домовленостях.** Rate snapshot фіксується один раз і ніколи не оновлюється сам; витрата зберігає суму й валюту введення — перерахунок є шаром поверх; base currency не змінюється, поки є витрати з курсом (AC-07); finished не блокує дозаповнення курсів (AC-08).

**Stakeholders.**

| Role | Interest | Sign-off owner? |
|---|---|---|
| `owner` | Єдиний користувач: вводить курс разом із витратою або постфактум, читає converted total поруч із сирими сумами, звіряє залишок бюджету | No |
| Tech Lead (я ж, автор фічі) | Архітектурний sign-off, ADR, dependency rule між BC — особливо новий напрямок порту (ADR-0004) | **Yes** |

## 2. Constraints

**Technical.** (Explore-скан проти `package-lock.json`, `migrations/` і SAD trip-budget)
- TypeScript 7.0.2 (`strict`, `NodeNext`) · Node ≥ 22 (локально v24.18.0) · Express 5.2.1 · pg 8.23.0 без ORM (docs/adr/0001) · zod 4.4.3 лише у presentation · vitest 4.1.11 + supertest 7.2.2 поверх `createApp` з in-memory репозиторіями.
- PostgreSQL — версія в репо не зафіксована (→ §11, той самий борг, що у trip-budget). `BIGINT` для курсу — стандартний тип, драйвер `pg` повертає його рядком → мапінг у `BigInt` в репозиторії.
- Схема зараз: `trips(id, title, country, starts_at, ends_at, status)`, `expenses(id, trip_id FK, amount_minor INTEGER CHECK ≥ 0, currency TEXT, category, spent_at)`. Колонки курсу **немає**. За SAD trip-budget міграція `0003` додає `trips.budget_minor`, `trips.base_currency` (nullable) — ця фіча йде **після** неї; наступна міграція — `0004`.
- У `expenses` немає жодного шляху змінити витрату після створення: ні use case, ні маршруту; `ExpenseRepository` має лише `save` (upsert) і `findByTrip` — `findById` доведеться додати.

**Organisational.**
- Effort: S (idea-brief §11 після зрізання scope). Deadline: поїздка у жовтні 2026 — **жорсткий** сезонний; послідовність: реалізація trip-budget (міграція 0003) → ця фіча. Team: 1 людина.

**Conventions.**
- CLAUDE.md: Clean Architecture, чотири шари на BC, `domain/` без фреймворків; BC не імпортують один одного напряму — лише `shared/` або порт із адаптером в `infrastructure/` (прецедент `TripRepositoryStatusPort`).
- Помилки: типізовані Error-класи → 404 / 409 / 422 у presentation; ID — `randomUUID()` у application; гроші — `Money` у minor units, `Balance` для різниць (trip-budget ADR-0004).
- AC → назва vitest-теста; міграції — нумеровані SQL-файли; PRD §9 називає дельту даних наперед (одне nullable-поле на `expenses`).

**Regulatory / external.**
- Немає: нове поле — число без PII (PRD §6.1), security review N/A. Межа доступу успадкована з trip-budget §8 (bind 127.0.0.1 + API-key).

## 3. Context and scope

trip-ledger — локальний single-user REST API обліку поїздок і витрат. Фіча не додає зовнішніх систем принципово: курс вводить owner руками (інваріант словника «жодних зовнішніх залежностей за курсами», PRD §3), тому банківські API, довідники ЄЦБ чи TravelSpend-подібні джерела за кордоном системи відсутні за рішенням. Кордон довіри — процес API: курс валідується zod-ом на межі як додатне число з ≤ 6 знаками після коми.

**Зовнішні системи — немає (свідомо; єдина «зовнішня» сутність — власна БД).**

<!-- brownfield: Explore-скан виконано 2026-09-02 (див. §2 Technical) -->

**External systems (in / out):**

| Actor or system | Type | Interaction |
|---|---|---|
| `owner` | Person | Вводить витрату з курсом або без; доставляє/виправляє курс постфактум (і у finished поїздці); читає підсумок із converted total; задає base currency поїздки |
| PostgreSQL | System (own datastore) | `expenses` (+ `rate_nano`), `trips` (`base_currency` з міграції 0003 trip-budget) |
| Джерела курсів валют | — | Відсутні за рішенням (PRD §3, CONTEXT «Out of scope») |

**C4 Context (L1):**

```mermaid
C4Context
    title trip-ledger — System Context (фіча multi-currency-summary)

    Person(owner, "owner", "вводить витрати й курси, читає converted total і залишок")
    System(ledger, "trip-ledger API", "Node/Express-моноліт: BC trips + BC expenses + shared, один процес")
    SystemDb(pg, "PostgreSQL", "expenses (+ rate_nano), trips (base_currency)")

    Rel(owner, ledger, "додає витрати з курсом, править курси, відкриває підсумок", "HTTP/JSON, локально")
    Rel(ledger, pg, "читає / пише", "pg 8.23, SQL без ORM")
```

## 4. Solution strategy

**Стратегічні стовпи (насіння для ADR):**

1. **Курс — атрибут витрати, зафіксований один раз; не журнал і не довідник.** Словник: «rate snapshot — курс до base currency, зафіксований на витраті один раз для перерахунку. NOT живий курс». PRD §3 виключає історію курсів, AC-05 каже: заміна просто перезаписує значення. Тож курс лягає однією nullable-колонкою на `expenses` (міграція 0004) і полем `rate?` на `Expense`; правка — новий use case `SetExpenseRate`, дозволений у finished поїздці (AC-08 — це не додавання витрати, інваріант «finished блокує нові витрати» не зачеплений). Зачіпає базу + чесні альтернативи (окрема таблиця курсів, довідник за датою) → **ADR-0001**.
2. **Курс зберігаємо й рахуємо цілим числом зі шкалою 10⁹, округлення half-up — одне правило на всю систему.** NFR «похибка ≤ 1 minor unit на витрату» + конвенція trip-budget §8 «плаваюча точка заборонена». Вхід приймає ≤ 6 знаків після коми (закриває PRD §8 OQ #1: 6), але зберігання ×10⁹, бо для курсів на кшталт VND→EUR (≈ 0.000037) шкала 10⁶ дає відносну похибку ~3%, яка на великих сумах пробиває 1 minor unit. Half-up (PRD §8 OQ #3, дефолт) фіксується тут, а не на стадії data model — бо це рішення про `shared/`, а не про колонку. → **ADR-0002**.
3. **Counted expense переозначується: «має ефективний курс», а не «у base currency»; converted total і remaining живляться з однієї функції.** PRD Goal 3 і AC-09 вимагають, щоб витрата з курсом входила у порівняння з budget. Тому `BudgetBlock` із trip-budget (її ADR-0002) рахує Σ counted у перерахованих сумах; витрата у base currency має похідний курс 1 (AC-06) — без збереження і без backfill, який передбачав PRD §9. Лічильник «без курсу» для converted total і лічильник uncounted для remaining — одне й те саме число. → **ADR-0003**; уточнює визначення counted/uncounted у `docs/features/trip-budget/CONTEXT.md` (→ `fix-term`, §11).

Четвертий стовп виріс не зі стратегії, а з §5: щоб AC-06 і AC-07 мали сенс, base currency має існувати незалежно від budget і бути заблокованою, поки є витрати з курсом — це рішення про напрямок портів між BC (**ADR-0004**).

Кожне тактичне рішення §5–§8 має простежуватись до одного зі стовпів; рішення, що суперечить стовпу, — рядок у §11.

## 5. Building block view

Стиль без змін — Clean Architecture з портами між BC. Фіча розширює `expenses` (атрибут, use case, агрегат), `shared` (value object курсу) і — несподівано для PRD — `trips`: у trip-budget base currency з'являлась лише разом із budget (її ADR-0001), а тут AC-06 («курс 1 для base currency сам») і AC-07 («не змінювати base currency, поки є курси») потрібні й поїздці без бюджету. Тому base currency стає **самостійним атрибутом поїздки** (задається при створенні або окремим use case; задання budget лишається сумісним — фіксує її, якщо ще не задана), а перевірка «є витрати з курсом?» іде через **зворотний порт** `RatedExpensesPort` у `trips/domain` з адаптером у `trips/infrastructure` поверх `ExpenseRepository` — дзеркало `TripRepositoryStatusPort`, але у другий бік. Це перший двонапрямний зв'язок між BC у репо — саме тому ADR-0004, а не рядок у §8.

Контракти: підсумок отримує блок `converted: { total, withoutRate } | null` (null — поки у поїздки немає base currency); відповідь додавання витрати — поле `rate` у `expense` (обов'язковий контракт — стадія API). Breaking change тут менший, ніж у trip-budget (форма вже об'єкт/envelope за її §5), але блок `budget` змінює семантику counted → §11.

**Дельта файлів (`+` новий, `~` змінюється):**

```
src/
├── shared/
│   ├── Money.ts                                     (без змін)
│   ├── Balance.ts                                   (з trip-budget ADR-0004, без змін)
│   └── Rate.ts                                    + ADR-0002: BigInt ×10⁹, Rate.parse('0.9123'), apply(Money) → Money (half-up), ONE = 10⁹
├── expenses/
│   ├── domain/Expense.ts                          ~ + rate?: Rate, withRate(); ExpenseRepository + findById(id); TripBudgetPort розширено до { baseCurrency: string | null, budget: Money | null } — base currency існує й без budget (ADR-0004)
│   ├── domain/errors.ts                           ~ + ExpenseNotFoundError
│   ├── application/AddExpense.ts                  ~ необов'язковий rate у вході (AC-01/AC-02)
│   ├── application/SetExpenseRate.ts              + замінити курс на збереженій витраті; без TripStatusPort — дозволено у finished (AC-05/AC-08)
│   ├── application/BudgetBlock.ts                 ~ counted = має ефективний курс; Σ у перерахованих сумах; + convertedTotal, withoutRate (ADR-0003)
│   ├── application/GetTripSummary.ts              ~ + converted: { total: Money(base), withoutRate } | null
│   ├── infrastructure/PostgresExpenseRepository.ts ~ мапінг rate_nano (string → BigInt); findById
│   ├── infrastructure/InMemoryExpenseRepository.ts ~ findById
│   └── presentation/expensesRouter.ts             ~ rate у схемі додавання (додатне, ≤ 6 знаків); маршрут заміни курсу
├── trips/
│   ├── domain/Trip.ts                             ~ + setBaseCurrency(currency, hasRatedExpenses) → BaseCurrencyLockedError; RatedExpensesPort (ADR-0004)
│   ├── application/CreateTrip.ts                  ~ необов'язкова baseCurrency при створенні
│   ├── application/SetTripBaseCurrency.ts         + задати/змінити base currency з перевіркою порту (AC-07)
│   ├── infrastructure/ExpenseRepositoryRatedPort.ts + адаптер зворотного порту поверх ExpenseRepository
│   └── presentation/tripsRouter.ts                ~ baseCurrency у створенні; маршрут зміни base currency
├── presentation/app.ts                            ~ зшивання RatedExpensesPort (trips ← expenses) поряд із TripStatusPort/TripBudgetPort
migrations/
└── 0004_add_expense_rate.sql                      + ALTER TABLE expenses ADD rate_nano BIGINT NULL CHECK (rate_nano > 0); послабити CHECK trips з 0003 (base currency без budget); expand-only, backfill немає
```

**Дельта міграцій:** `migrations/0004_add_expense_rate.sql` — `ALTER TABLE expenses ADD COLUMN rate_nano BIGINT NULL CHECK (rate_nano > 0)`; expand-only; backfill **немає** — PRD §9 передбачав backfill курсу 1 для витрат у base currency, але правило «валюта витрати = base currency ⇒ курс 1» похідне й обчислюється на читанні (ADR-0003), тож старі рядки лишаються `NULL` і вже counted. Той самий файл послаблює CHECK з 0003: `(budget_minor IS NULL) = (base_currency IS NULL)` → `(budget_minor IS NULL OR base_currency IS NOT NULL)` — base currency без budget стає валідною, budget без base currency — ні (ADR-0004). Передумова: міграція 0003 (trip-budget) вже застосована.

**C4 Container (L2):**

```mermaid
C4Container
    title trip-ledger — Containers (дельта фічі multi-currency-summary)

    Person(owner, "owner", "вводить витрати й курси, читає підсумок")

    Container_Boundary(api, "trip-ledger — один Node-процес (Express 5.2.1)") {
        Container(http, "HTTP presentation", "Express 5 + zod 4", "expensesRouter (rate у додаванні, маршрут заміни курсу), tripsRouter (base currency)")
        Container(trips, "BC trips", "TypeScript", "Trip.setBaseCurrency, SetTripBaseCurrency, адаптер RatedExpensesPort")
        Container(expenses, "BC expenses", "TypeScript", "Expense.rate, AddExpense, SetExpenseRate, BudgetBlock (converted total + counted за курсом), GetTripSummary")
        Container(shared, "shared", "TypeScript", "Money, Balance, Rate (×10⁹, half-up)")
    }

    ContainerDb(pg, "PostgreSQL", "expenses, trips", "міграція 0004: expenses.rate_nano BIGINT NULL + послаблений CHECK trips (після 0003: trips.base_currency)")

    Rel(owner, http, "REST-запити", "HTTP/JSON, локально")
    Rel(http, trips, "виклики use case-ів", "in-process")
    Rel(http, expenses, "виклики use case-ів", "in-process")
    Rel(expenses, trips, "TripStatusPort, TripBudgetPort", "in-process, лише через порт")
    Rel(trips, expenses, "RatedExpensesPort — новий напрямок (ADR-0004)", "in-process, лише через порт")
    Rel(trips, shared, "Money")
    Rel(expenses, shared, "Money, Balance, Rate")
    Rel(trips, pg, "trips: читає/пише", "pg 8.23 SQL")
    Rel(expenses, pg, "expenses: читає/пише", "pg 8.23 SQL")
```

## 6. Runtime view

<!-- arch-forge: учасники = контейнери §5, повідомлення семантичні (без HTTP-дієслів/шляхів/статус-кодів — це стадія API).
     XS/S: 1–3 flow (по одному на ключову US + відмови у alt-гілках); M+: 3–5, включно з failure-mode.
     Кожен flow закінчується рядком «Тестовий слід» — назви vitest/supertest-тестів, що його доводять. -->

**Critical flow 1: <назва>** — <US-xx; AC-xx>.

```mermaid
sequenceDiagram
    actor O as <роль>
    participant HTTP as HTTP presentation
    participant B as BC <bc>
    participant DB as PostgreSQL

    O->>HTTP: <семантична дія>
    HTTP->>B: <UseCase(...)>
    B->>DB: <що читає/пише>
    DB-->>B: <результат>
    alt <відмова за правилом>
        B-->>HTTP: <TypedError>
        HTTP-->>O: відмова з поясненням
    else ок
        B-->>HTTP: <результат>
        HTTP-->>O: <що бачить користувач>
    end
```

**Тестовий слід:** `it('<happy path>')`, `it('<відмова>')` — <файл>.

**Critical flow 2: <назва>** — <або «немає — XS-фіча з одним flow»>.

## 7. Deployment view

<!-- arch-forge: дефолт для фіч в одному процесі — N/A з фіксованим текстом нижче + одне речення обсягу даних.
     Реальна топологія лише якщо фіча додає процес/воркер/чергу/сховище (тоді має бути узгоджена з §5). -->

<!-- N/A: фіча переюзає існуючий деплой — один Node-процес + PostgreSQL; реплік, порогів масштабування й моніторингу не змінює -->

Обґрунтування одним рядком: <що додає фіча; обсяг даних у цифрах з PRD §1>.

## 8. Crosscutting concepts

<!-- arch-forge: рядки передзаповнені дефолтами мого стека — підтверди або зміни; нові рядки лише якщо PRD §6/§6.1 цього вимагає.
     Рішення з 0–1 критерієм радіусу впливу живуть тут inline; що відкладено — рядок у §11 з owner+due. -->

| Concept | Convention | Where defined |
|---|---|---|
| Error handling | типізовані доменні Error-класи → presentation: відсутність 404, відмова state-машини 409, порушення правила даних 422; <нові класи фічі> | CLAUDE.md; `<bc>/domain/errors.ts` |
| Validation | zod лише на межі presentation; <нові поля і їх правила> | CLAUDE.md |
| Money & precision | `Money` — цілі minor units, невід'ємний; `Balance` — знакові; коефіцієнти — scaled integer; плаваюча точка заборонена | `src/shared/` |
| ID strategy | `randomUUID()` (v4) у application; <чи має нова сутність власний id> | CLAUDE.md |
| Access boundary | single-user: bind 127.0.0.1 + API-key middleware (SPEC.md); 401 без деталей | SPEC.md; `app.ts` |
| Cross-BC access | лише порти у `<споживач>/domain` + адаптери в `<споживач>/infrastructure`; напрямок <…>; зворотний порт — тільки з ADR | CLAUDE.md; ADR-NNNN |
| Persistence & migrations | нумеровані SQL-файли; <тип міграції фічі>; upsert `ON CONFLICT (id) DO UPDATE` | `migrations/` |
| Logging / Observability | `console`; латентність міряємо k6 smoke у CI і таймінгами supertest, трасування немає | — |
| Rate limiting | <немає у v1 / рядок у §11> | §11 |
| Internationalisation | N/A — повідомлення англійською, як у коді | — |

## 9. Architecture decisions

<!-- arch-forge: дзеркало папки adr/ — кожен файл має рядок, кожен рядок має файл. Колонка BC — з префікса імені файлу. -->

| # | BC | Title | Status | Section |
|---|---|---|---|---|
| NNNN | <bc> | <рішення у наказовій формі> | Accepted | §<N> |

ADR files live under `docs/features/<slug>/adr/NNNN-<bc>-<title>.md`.

Дивись: [[adr/NNNN-<bc>-<title>]]

## 10. Quality requirements

<!-- arch-forge: по сценарію на кожну QG з §1. Числа — ДОСЛІВНО з PRD §6 NFR (не округлювати, не вигадувати).
     How verify — назва тесту (`it('…')` у конкретному файлі) або k6-команда з CI, не «інтеграційний тест». -->

**QG-1. <якість>**
- **When:** <тригер з конкретними даними>
- **Then:** <очікування з числом з PRD §6>
- **How verify:** `<файл>.test.ts` — `it('…')`; <k6 smoke>

**QG-2. <якість>**
- **When:** <…>
- **Then:** <…>
- **How verify:** <…>

**QG-3. <інваріант / ізоляція>**
- **When:** <…>
- **Then:** <…>
- **How verify:** <…>

## 11. Risks and technical debt

<!-- arch-forge: перший рядок — продуктовий ризик (з PRD §10/idea-brief devil's advocate), далі breaking changes контрактів,
     brownfield gotchas з Explore (≥ 1), відкриті питання з edits-log (severity = «Open question», owner + due обов'язкові). -->

| Risk / debt | Severity | Mitigation | Owner |
|---|---|---|---|
| <продуктовий ризик> | High/Medium/Low | <…> | <owner> |
| <breaking change контракту> | Medium | <тести, стадія API> | <owner> |
| <brownfield gotcha з Explore> | Low/Medium | <…> | <owner> |
| Open architectural decision: <заголовок> | Open question | Resolve before <стадія/дата>; <причина> | <owner> |

**Accepted debt (acceptable in v1, plan to fix later):**
- <…>

## 12. Glossary

<!-- arch-forge: лише терміни, вжиті в тілі SAD; доменні — дослівно з кореневого CONTEXT (з NOT-межею), технічні —
     з позначкою «технічний термін» і кандидатурою у fix-term, якщо термін доменний за суттю. -->

| Term | Meaning |
|---|---|
| <доменний термін> | <дослівно з CONTEXT + NOT-межа> |
| <технічний термін> | Технічний термін (не з CONTEXT): <що це у коді> |
