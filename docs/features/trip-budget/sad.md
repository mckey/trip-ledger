---
status: Draft
owner: "Vladimir Makarov"
reviewers: []
updated_at: "2026-09-02"
feature_size: S
stage: "04-05"
ticket: "-"
---

# Software Architecture Document — trip-budget

<!-- Stages 04-05 → see sdlc/plugin/skills/architecture-design/SKILL.md -->
<!-- 12 Arc42 sections. Empty sections — <!-- N/A: <one-line reason> -->. -->
<!-- C4 Context (L1) lives inline in §3. C4 Container (L2) lives inline in §5. -->
<!-- Заповнений приклад: див examples/course-lesson-mvp/sad.md у sdlc/ toolkit. -->

## 1. Introduction and goals

**Intent.** trip-budget додає до поїздки планову стелю витрат — один `budget` однією сумою в `base currency`. Далі система сама відповідає на два питання, які зараз owner рахує в голові: «скільки ще можна витратити» (`remaining` у підсумку поїздки) і «чи я вже вийшов за план» (`overspend signal` прямо у відповіді на додавання витрати). Витрати в інших валютах у порівняння не входять, але підсумок чесно показує їх лічильником `uncounted expenses` — це Approach A з idea-brief §13 (RICE 8), без конвертації валют, без прогнозів і без розбивки по категоріях.

Це brownfield-фіча: розширює два наявні bounded context-и (`src/trips`, `src/expenses`) і `src/shared`, нових процесів і сервісів не додає.

**Top-3 quality goals (1-liners; full scenarios у §10; терміни у §12):**

1. **QG-1 Точність грошей — 0 похибки округлення.** Усі суми (budget, витрати, remaining) живуть у цілих мінорних одиницях (integer), як `Money`; плаваючої точки в арифметиці немає (PRD §6 NFR «Точність грошей»).
2. **QG-2 Латентність і пропускна здатність існуючих ендпойнтів не деградує.** Підсумок із блоком залишку — p95 ≤ 250 ms; задання/заміна budget — p95 ≤ 150 ms; ≥ 30 req/s на 1 інстанс (PRD §6 NFR).
3. **QG-3 Ізоляція домену: budget — план, не заборона і не мутація.** Витрата приймається завжди, навіть з перевищенням (інваріант словника); зміна budget не мутує жодну витрату — remaining є шаром поверх (AC-04, AC-05); межа між BC зберігається — `expenses` бачить `trips` лише через порт (CLAUDE.md).

**Stakeholders.**

| Role | Interest | Sign-off owner? |
|---|---|---|
| `owner` | Єдиний користувач: задає budget, вводить витрати, читає підсумок; хоче дізнаватись про перевитрату в поїздці, а не вдома | No |
| Tech Lead (я ж, автор фічі) | Архітектурний sign-off, ADR, дотримання dependency rule з CLAUDE.md | **Yes** |
| PM | Відсутній (pet-проєкт); підтвердження §10 Quality Goals бере на себя owner | No |

## 2. Constraints

**Technical.** (перевірено Explore-сканом репозиторію проти `package-lock.json` і `migrations/`)
- TypeScript 7.0.2, `strict`, module `NodeNext`; Node ≥ 22 (`engines`), локально v24.18.0.
- Express 5.2.1 — єдиний транспорт, JSON API без UI (SPEC.md).
- pg 8.23.0 напряму, без ORM — docs/adr/0001; репозиторії пишуться руками під інтерфейси з `domain/`.
- zod 4.4.3 — лише у `presentation/` (`safeParse` → 422 `{errors}`).
- vitest 4.1.11 + supertest 7.2.2; тести колокуються як `*.test.ts`, HTTP-тести їздять поверх `createApp` з in-memory репозиторіями.
- PostgreSQL — версія в репо ніде не зафіксована (немає docker-compose, лише `DATABASE_URL` у `.env.example`) → §11.
- Схема: `trips(id TEXT PK, title, country, starts_at, ends_at, status CHECK planned|active|finished)`, `expenses(id TEXT PK, trip_id FK, amount_minor INTEGER CHECK ≥ 0, currency TEXT, category CHECK …, spent_at)`. Колонок budget/base currency **немає**.
- Міграції — нумеровані SQL-файли у `migrations/` (`0001_…`, `0002_…`); наступна — `0003`.

**Organisational.**
- Effort budget: 1 person-week (idea-brief §11 RICE E = 1; F1/F2 займали по вечору).
- Deadline: довга поїздка у жовтні 2026 — **жорсткий** сезонний дедлайн: не встигнемо — наступне бойове вікно взимку (PRD §1).
- Team: 1 людина (owner = розробник = архітектор).

**Conventions.**
- CLAUDE.md: Clean Architecture, чотири шари на BC, залежності тільки всередину; `domain/` не імпортує фреймворків; `trips` і `expenses` не імпортують один одного — тільки `shared/` або через порт (`TripStatusPort` → `TripRepositoryStatusPort` в infrastructure).
- Один use case = один клас з `execute()`; доменні сутності — класи без декораторів, інваріанти у конструкторі/методах.
- Помилки: типізовані доменні Error-класи (`TripNotFoundError` → 404, `TripNotAcceptingExpensesError` → 409), zod-валідація → 422; мапінг лише у `presentation/`.
- ID: `randomUUID()` (v4) генерується у application-шарі; гроші — `Money` у цілих мінорних одиницях, `add()` кидає на розбіжності валют.
- AC → назва vitest-теста (конвенція з PRD/prd-forge): кожен AC з PRD §5 має читатись як `it('…')`.

**Regulatory / external.**
- Немає. Дані — особисті фінансові записи owner-а, класифікація `internal`, нових PII-полів немає, security review N/A (PRD §6.1).
- Межа доступу v1 — single-user: SPEC.md фіксує «один власник, API-key в .env»; механізм — §8, закриває PRD §8 OQ #1.

## 3. Context and scope

trip-ledger — локальний REST API для обліку власних поїздок і витрат; єдиний актор — `owner`. Фіча не додає зовнішніх інтеграцій: курси валют не тягнемо (інваріант словника «жодних зовнішніх залежностей за курсами»), каналів сповіщень (пуші, листи) немає і не буде у v1 (PRD §3). Кордон довіри — процес API: усе, що приходить по HTTP, валідується zod-ом на межі `presentation/`; за кордоном лише PostgreSQL.

**Зовнішні системи — немає.** Це свідоме рішення, записане замість мовчання: єдина «зовнішня» сутність — власна база даних.

<!-- brownfield: Explore-скан виконано 2026-09-02 (див. §2 Technical) -->

**External systems (in / out):**

| Actor or system | Type | Interaction |
|---|---|---|
| `owner` | Person | Задає/замінює budget; додає витрати й отримує overspend signal; відкриває підсумок із remaining та uncounted |
| PostgreSQL | System (own datastore) | Зберігає `trips` (+ `budget_minor`, `base_currency`) та `expenses` |
| Зовнішні сервіси (курси валют, сповіщення) | — | Відсутні за рішенням (PRD §3, CONTEXT «Out of scope») |

**C4 Context (L1):**

```mermaid
C4Context
    title trip-ledger — System Context (фіча trip-budget)

    Person(owner, "owner", "єдиний користувач: задає budget, вводить витрати, читає підсумок")
    System(ledger, "trip-ledger API", "Node/Express-моноліт: BC trips + BC expenses, JSON API, один процес")
    SystemDb(pg, "PostgreSQL", "trips (+ budget_minor, base_currency), expenses")

    Rel(owner, ledger, "задає budget, додає витрати, відкриває підсумок", "HTTP/JSON, локально")
    Rel(ledger, pg, "читає / пише", "pg 8.23, SQL без ORM")
```

## 4. Solution strategy

<!-- 🎯 Навіщо: 3-4 СТРАТЕГІЧНІ СТОВПИ, з яких потім ростуть усі ADR. Без §4 кожен ADR    -->
<!--           виглядає випадковим — нема зонтика. ⭐ Найгустіша секція — тут ADR-gate    -->
<!--           спрацьовує майже завжди (рішення незворотні + мульти-модульні).            -->
<!-- 📋 Що писати: список з 3-4 виборів. На кожен — заголовок + 2-3 речення rationale.    -->
<!-- 📌 Приклад: «Зберігати урок як таблицю блоків» — стовп, з якого виросло ADR-0001.    -->

**Top-3 strategic choices (the seeds for ADRs):**

1. **<e.g. Module isolation through events>** — <2-3 sentences rationale referencing Quality Goals and constraints>.
2. **<e.g. Single-store persistence (Postgres)>** — <2-3 sentences>.
3. **<e.g. Server-rendered dashboard>** — <2-3 sentences>.

Each tactical decision in later sections should be traceable to one of these strategic seeds. Tactical decisions that *contradict* a strategic choice are red flags — surface them in §11 Risks.

## 5. Building block view

<!-- 🎯 Навіщо: ВНУТРІШНЯ ДЕКОМПОЗИЦІЯ — модулі, контейнери, БД. Статична топологія:   -->
<!--           хто з ким може говорити. Без §5 §6 (сценарії) не має словника учасників. -->
<!-- 📋 Що писати: 1 абзац про стиль (шари/гексагональна/clean/на подіях) +            -->
<!--           дерево папок + Mermaid C4Container.                                       -->
<!-- 📌 Приклад: «web-app, content-api, media-worker, postgres, s3, cdn».                -->

<One paragraph: layered / hexagonal / clean / event-driven. Why.>

**Internal decomposition:**

```
<e.g. internal/modules/goals/>
├── domain/       <entities + sentinel errors>
├── app/          <use cases / services>
├── infra/        <repository + outbox impl>
├── ports/        <HTTP handlers, DTOs, error mapping>
└── module.go     <self-wiring>
```

**C4 Container (L2):**

```mermaid
C4Container
    title <system> — Containers

    Person(user, "<User>")

    Container_Boundary(boundary, "<Our System>") {
        Container(web, "<Web/API container>", "<technology>", "<purpose>")
        Container(svc, "<Service container>", "<technology>", "<purpose>")
        ContainerDb(db, "<DB>", "<technology>", "<purpose>")
    }

    System_Ext(ext, "<External>", "<purpose>")

    Rel(user, web, "<interaction>", "<protocol>")
    Rel(web, svc, "<service calls>")
    Rel(svc, db, "<reads/writes>", "<driver>")
    Rel(svc, ext, "<emits>", "<protocol>")
```

## 6. Runtime view

<!-- 🎯 Навіщо: ПОТІК У RUNTIME для 1-2 критичних сценаріїв. Хто з ким коли і у якому     -->
<!--           порядку говорить. Без §6 §5 — лише купа коробок без життя.                  -->
<!-- 📋 Що писати: Mermaid sequenceDiagram. Учасники — імена з §5 (не вигадуй нові!).      -->
<!--           Повідомлення семантичні («складає чорновик»), БЕЗ HTTP-методів/шляхів —     -->
<!--           ендпоінт-рівневі sequence-діаграми зʼявляться у stage 06 (define-api).      -->
<!-- 📌 Приклад: «methodist → web-app: складає чорновик → web-app → content-api: зберегти». -->

**Critical flow 1: <flow name>**

```mermaid
sequenceDiagram
    actor User
    participant API
    participant Service
    participant DB
    User->>API: <request>
    API->>Service: <call>
    Service->>DB: <write tx>
    DB-->>Service: ok
    Service-->>API: result
    API-->>User: 201
```

<!-- For XS/S: 1 flow above is enough. For M+: add 2-4 more (e.g. failure-mode flow, async flow). -->

**Critical flow 2: <e.g. async event propagation>** — <if applicable, otherwise N/A>.

## 7. Deployment view

<!-- 🎯 Навіщо: ТОПОЛОГІЯ, яку DevOps має знати без читання Helm-чартів — скільки реплік,  -->
<!--           де живе фоновий обробник, ПРИ ЯКИХ ЧИСЛАХ масштабуємось.                     -->
<!-- 📋 Що писати: 2-3 речення про топологію + метрики + алерти + конкретні числа-пороги.   -->
<!-- 📌 Приклад: «500 IC → партиціонування за кварталом» (не «при зростанні подумаємо»).    -->
<!-- 🎯 Можна N/A для XS/S функцій, що переюзають існуюче розгортання без змін.            -->

<Topology in 2-3 sentences. Where it runs (k8s / VM / serverless), replicas, scaling thresholds.>

**Monitoring:**
- <Metrics — e.g. Prometheus `<metric_name>`>
- <Alerts — e.g. "outbox lag > 10 min → page on-call">
- <Tracing — e.g. OpenTelemetry HTTP spans>

**Scaling thresholds:**
- <e.g. 500 IC × 5 goals × 26 checkpoints/Q = 65k rows/year — comfortable in one table>
- <e.g. partitioning by quarter at >500k rows/year>

<!-- For XS/S that doesn't change deployment: <!-- N/A: feature reuses existing deployment unit -->. -->

## 8. Crosscutting concepts

<!-- 🎯 Навіщо: НАСКРІЗНІ ПАТЕРНИ, які перетинають кілька модулів: логування, помилки,    -->
<!--           авторизація, ID strategy, outbox, кеш. ⭐ Друга найгустіша секція.          -->
<!--           Якщо патерн всередині одного модуля — він НЕ сюди. Якщо це конвенція        -->
<!--           проєкту в цілому — у CLAUDE.md.                                              -->
<!-- 📋 Що писати: таблиця концепт / конвенція / де визначено. Один рядок на концепт.      -->
<!-- 📌 Приклад: «UUID v7 (час+випадковий, сортується) у app-layer» — як default з CLAUDE.md. -->

| Concept | Convention | Where defined |
|---|---|---|
| Logging | <e.g. structured slog, fields `module=<name>`> | <CLAUDE.md §X or here> |
| Authentication | <e.g. JWT via session middleware> | <CLAUDE.md §X> |
| Error handling | <e.g. domain sentinel → ports/errors.go → apperr JSON> | <CLAUDE.md §X> |
| ID strategy | <e.g. UUID v7 in app layer> | <CLAUDE.md §X> |
| Internationalisation | <e.g. N/A, English only> | — |
| Observability | <e.g. OpenTelemetry on HTTP boundaries> | — |
| Outbox / events | <module-specific patterns, if any> | <here> |

## 9. Architecture decisions

<!-- 🎯 Навіщо: ЗВОРОТНИЙ ІНДЕКС на папку adr/. `ls adr/` дає файли, §9 дає семантику —    -->
<!--           чому вони існують, до якого зрізу SAD привʼязані, у якому статусі.           -->
<!-- 📋 Що писати: таблиця з 4 колонками. Один рядок на ADR. Mixed status — це OK.         -->
<!-- 📌 Приклад: «0001 | Зберігати урок як таблицю блоків | Accepted | §4».                -->

| # | Title | Status | Section |
|---|---|---|---|
| <NNNN> | <imperative — e.g. "Use sliding window for rate limiting"> | Accepted | §<N> |
| <NNNN> | <imperative — e.g. "Co-locate outbox worker in API process"> | Accepted | §<N> |

ADR files live under `docs/features/<slug>/adr/NNNN-<title>.md`.

## 10. Quality requirements

<!-- 🎯 Навіщо: ДЕРЕВО ЯКОСТЕЙ (Quality Tree) — беремо мету з §1 і розкладаємо на          -->
<!--           конкретні листя: тести, метрики, конфіги, drill-и. ⭐ Без §10 §1 — це       -->
<!--           маніфест. З §10 кожна декларація мапиться на щось, ЩО МОЖНА ДОВЕСТИ.        -->
<!-- 📋 Що писати: на кожну якість з §1 — When / Then / How verify. Числа з PRD §6 NFR     -->
<!--           ДОСЛІВНО (не округлюй p95 ≤250мс до ≤300мс — це F6-помилка критика).        -->
<!-- 📌 Приклад: «p95 ≤500 мс на UPDATE блоку, перевіримо k6 load test 100 req/s».        -->

Each top-3 goal from §1 expanded into a full scenario:

**QG-1. <quality attribute>**
- **When:** <trigger condition>
- **Then:** <expected behavior with numbers from PRD NFR>
- **How verify:** <test / chaos drill / load test / observability>

**QG-2. <quality attribute>**
- **When:** <trigger>
- **Then:** <expected>
- **How verify:** <how>

**QG-3. <quality attribute>**
- **When:** <trigger>
- **Then:** <expected>
- **How verify:** <how>

## 11. Risks and technical debt

<!-- 🎯 Навіщо: ⭐ збирає ВСЕ, що може зламатись — і не лише технічне. Без §11 ризики   -->
<!--           обговорюються на стендапах і губляться; борг лишається у голові того,    -->
<!--           хто його прийняв.                                                          -->
<!-- 📋 Що писати: таблиця ризик/борг — серйозність — мітигація — власник. Технічний    -->
<!--           борг окремою секцією.                                                      -->
<!-- 📌 Приклад: «EM не пушить — member не оновлює дані | High | …». Перший ризик —      -->
<!--           часто продуктовий, не технічний. Це нормально.                            -->

<!-- Severity column literals: Low / Medium / High for regular risks; "Open question" for rows
     created by Step-7 `Save as Open Question` resolutions (see references/socratic-loop.md). -->

| Risk / debt | Severity | Mitigation | Owner |
|---|---|---|---|
| <e.g. Outbox lag may reach hours during downstream outage> | Medium | <Alert >10 min, on-call playbook, retry backoff> | <DevOps> |
| <e.g. No event schema versioning in v1> | Medium | <ADR-NNNN planned for v2, graceful handling of unknown fields> | <Backend> |
| Open architectural decision: <decision-headline> | Open question | Resolve before <stage trigger or YYYY-MM-DD>; <inline rationale from Step-7 Save-as-OQ> | <owner> |

**Accepted debt (acceptable in v1, plan to fix later):**
- <e.g. Goal entity is not versioned (immutable) — OK for v1, may need audit versioning in v2>

## 12. Glossary

<!-- 🎯 Навіщо: ⭐ СЛОВНИК ДОМЕНУ, який припиняє суперечки через рік («checkpoint —      -->
<!--           weekly чи biweekly? Quarter — календарний чи фіскальний?»).                -->
<!-- 📋 Що писати: таблиця термін / значення. Бізнес-терміни + технічні вперемішку.       -->
<!--           Один термін може мати дві мови у заголовку: «Goal (Обʼєктив)».              -->
<!-- 📌 Приклад: «Lesson | урок усередині курсу, що складається з блоків (text, video)». -->

| Term | Meaning |
|---|---|
| <e.g. Goal> | <quarterly intent in statement form> |
| <e.g. KR> | <Key Result — measurable target linked to a Goal> |
| <e.g. Checkpoint> | <bi-weekly progress update on a KR> |
