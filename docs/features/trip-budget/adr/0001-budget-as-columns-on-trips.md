---
status: Accepted
owner: "Vladimir Makarov"
reviewers: []
updated_at: "2026-09-02"
feature_size: S
stage: "04-05"
ticket: "-"
---

# 0001 — Зберігати budget і base currency колонками на `trips`, не окремою сутністю

- **Status:** Accepted
- **Date:** 2026-09-02
- **Deciders:** Vladimir Makarov (owner фічі, архітектор) — Socratic walk `architecture-design`

## Контекст

PRD §4 (US-01, US-05, US-06): owner задає budget поїздки однією сумою в base currency, може замінити його будь-коли — і у finished поїздці теж; історія значень не ведеться (PRD §3 non-goal). У репозиторії таблиця `trips` не має ані budget, ані валюти (Explore-скан, sad.md §2), тож питання «де живе план поїздки» треба вирішити до міграції 0003 і до контракту API.

За евристикою масштабу удару: рішення зачіпає **2 модулі** (`trips` — власник даних, `expenses` — читач через порт), змінити місце зберігання пізніше означає **міграцію даних із backfill-ом**, і є **чесні альтернативи** (окрема таблиця, окремий BC). 3 з 3 → ADR.

## Драйвери рішення

- CONTEXT.md: «budget — планова стеля витрат на поїздку однією сумою в base currency. NOT summary» — це атрибут плану поїздки, не самостійна сутність.
- PRD §3: історія змін budget — non-goal v1; AC-07: заміна просто перезаписує значення.
- sad.md §2 Organisational: 1 person-week і жорсткий жовтневий дедлайн — мінімальна дельта схеми.
- CLAUDE.md: `trips` і `expenses` не імпортують один одного; читання budget з `expenses` має йти через порт незалежно від того, де лежить колонка.
- sad.md §1 QG-3: budget — план, не заборона; він не має впливати на `canAcceptExpenses()`.

## Розглянуті варіанти

1. **Дві nullable-колонки на `trips` + поля на `Trip`.** `ALTER TABLE trips ADD budget_minor INTEGER NULL CHECK (budget_minor > 0), ADD base_currency TEXT NULL; CHECK ((budget_minor IS NULL) = (base_currency IS NULL))`. `Trip` отримує `budget?: Money`, `baseCurrency?: string`, метод `setBudget()`; новий use case `SetTripBudget` у `trips/application`.
2. **Окрема 1:1-таблиця `trip_budgets(trip_id PK → trips, amount_minor, currency, set_at)`.** `trips` не чіпаємо; історія значень пізніше додається без зміни схеми (прибрати PK з `trip_id`, додати рядки). Але це друга таблиця, другий репозиторій і JOIN у кожному читанні budget заради історії, яку PRD явно виключив.
3. **Новий BC `budgets`** зі своїм `domain/application/infrastructure/presentation`. Чиста межа, але третій контекст заради одного поля й одного use case; `expenses` довелося б читати два порти з двох BC (статус — з `trips`, budget — з `budgets`).

## Результат рішення

**Обрано:** Варіант 1 — колонки на `trips`, атрибути `Trip`.

**Чому переміг:** словник називає budget планом *поїздки*, і у нього немає власного життєвого циклу — отже, немає підстав для окремої сутності чи BC. Одна міграція expand-only (старі рядки валідні без backfill), один use case, жодного нового репозиторію — вкладається у бюджет 1 person-week (§2). Перше задання budget одночасно фіксує base currency поїздки; наступні заміни мусять бути в тій самій валюті (AC-02) — це закриває питання «звідки поїздка знає свою base currency» без окремого поля-налаштування.

## Наслідки

**Позитивні:**
- Мінімальна дельта схеми й коду; міграція 0003 зворотно сумісна — колонки nullable, `budget: null` = «не задано».
- `Trip` лишається єдиним джерелом правди про поїздку; `canAcceptExpenses()` не залежить від budget (QG-3).
- `expenses` читає budget тим самим шляхом, що й статус — через порт над `TripRepository` (ADR-0002).

**Негативні:**
- Зміни base currency у v1 немає: помилково задану валюту доведеться виправляти ручним запитом; правило зміни base currency визначить фіча multi-currency-summary (її AC-07).
- Якщо історія змін budget таки стане потрібною — це міграція на варіант 2 з перенесенням поточних значень (дешево за обсягом, але зміна схеми й репозиторію).

**Нейтральні:**
- `trips` отримує другий use case і другий маршрут запису; форма контракту фіксується на стадії 6.6.
- CHECK-обмеження у БД дублює доменну валідацію (`Money` не приймає ≤ 0 для budget) — свідомо, як друга лінія захисту.

## Links

- PRD: [[../PRD.md]] §4 US-01/US-05/US-06, §5 AC-01/AC-02/AC-07/AC-09, §3 Non-goals (історія budget)
- SAD: [[../sad.md]] §4 Стратегія (стовп 1 — звідки тригернувся цей ADR), §5 Building blocks (`Trip`, `SetTripBudget`, міграція 0003), §8 Persistence & migrations
- Сусідній ADR: [[0002-remaining-computed-in-expenses-via-trip-budget-port]] — як `expenses` читає збережений тут budget; разом утворюють один договір «де лежить план і хто його читає»
