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

<!-- arch-forge: 3 стовпи (2 для XS), кожен — з ПОСИЛАННЯМ на інцидент, AC або обмеження з §2/Invariants, і з назвою ADR,
     який з нього виріс (або «inline — 1 з 4 критеріїв»). Item-bank: де живе нове поле · як BC дістає чуже · форма відповіді
     · тип грошей · вид міграції. Рішення, що суперечить Invariants, — red flag: або переформулювати, або Override у §1 ¶4. -->

**Стратегічні стовпи (насіння для ADR):**

1. **<Стовп 1>** — <2–3 речення; Invariant/AC/інцидент; → ADR-NNNN або inline>.
2. **<Стовп 2>** — <…>.
3. **<Стовп 3>** — <…>.

Кожне тактичне рішення §5–§8 має простежуватись до одного зі стовпів; рішення, що суперечить стовпу, — рядок у §11.

## 5. Building block view

<!-- arch-forge: контейнери мого стека відомі наперед — HTTP presentation (Express + zod), по контейнеру на BC, shared,
     PostgreSQL. Малюй їх одразу і опиши лише ЗМІНИ: новий BC? новий порт? зворотний порт (→ ADR)? нова таблиця?
     Обов'язкові підблоки: «Дельта файлів» (+ новий / ~ змінюється) і «Дельта міграцій». -->

<1 абзац: стиль (Clean Architecture як у репо), що саме розширюємо, які порти між BC; breaking changes контрактів — назвати і відправити у §11>

**Дельта файлів (`+` новий, `~` змінюється):**

```
src/
├── shared/                 <…>
├── <bc-1>/
│   ├── domain/             <~/+ …>
│   ├── application/        <~/+ …>
│   ├── infrastructure/     <~/+ …>
│   └── presentation/       <~/+ …>
├── <bc-2>/                 <…>
└── presentation/app.ts     <~ зшивання портів / middleware>
```

**Дельта міграцій:** `migrations/NNNN_<назва>.sql` — <DDL одним рядком; expand-only / expand + backfill / contract; backfill є/немає> · або «немає — обчислення поверх наявних даних».

**C4 Container (L2):**

```mermaid
C4Container
    title <репо> — Containers (дельта фічі <slug>)

    Person(<id>, "<роль>", "<що робить>")

    Container_Boundary(api, "<репо> — один Node-процес (Express <версія>)") {
        Container(http, "HTTP presentation", "Express + zod", "<роутери, що змінюються>")
        Container(<bc1>, "BC <bc1>", "TypeScript", "<сутності, use case-и, репозиторії, що змінюються>")
        Container(<bc2>, "BC <bc2>", "TypeScript", "<…>")
        Container(shared, "shared", "TypeScript", "<value objects>")
    }

    ContainerDb(pg, "PostgreSQL", "<таблиці>", "<міграція NNNN>")

    Rel(<id>, http, "REST-запити", "HTTP/JSON")
    Rel(http, <bc1>, "виклики use case-ів", "in-process")
    Rel(http, <bc2>, "виклики use case-ів", "in-process")
    Rel(<bc2>, <bc1>, "<порти>", "in-process, лише через порт")
    Rel(<bc1>, pg, "SQL", "pg")
    Rel(<bc2>, pg, "SQL", "pg")
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
