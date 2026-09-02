---
status: Accepted
owner: "Vladimir Makarov"
reviewers: []
updated_at: "2026-09-02"
feature_size: S
stage: "03"
ticket: "-"
bc: "expenses"
---

# 0001 — Зберігати rate snapshot nullable-колонкою на `expenses` і правити його окремим use case без перевірки статусу поїздки

- **Status:** Accepted
- **Date:** 2026-09-02
- **Deciders:** Vladimir Makarov (owner фічі, архітектор) — Socratic walk `arch-forge`

## Контекст

PRD US-01/US-04/US-06: owner необов'язково вказує курс до base currency при введенні витрати в чужій валюті, може замінити його пізніше і доставити постфактум — у тому числі у finished поїздці (AC-05, AC-08). Історії курсів немає (PRD §3), заміна перезаписує значення. У репо зараз `expenses` не має ані колонки курсу, ані жодного шляху змінити витрату після створення: `ExpenseRepository` = `save` (upsert) + `findByTrip`, use case-ів update/route немає (Explore §f). Вирішувати треба до міграції 0004 і до контракту API.

Виключено існуючими обмеженнями (не як альтернативи): курс «на поїздку і валюту» замість «на витраті» — словник фіксує rate snapshot саме на витраті; автоматичні джерела курсів — CONTEXT «Out of scope» / PRD §3.

## Радіус впливу (4 критерії)

| Незворотнє (≥ 3 днів) | ≥ 2 модулі | Чесна альтернатива | Зачіпає базу |
|---|---|---|---|
| ✓ — перенос курсу в окрему таблицю пізніше = міграція з backfill усіх витрат | ✓ — `expenses` пише, `BudgetBlock`/підсумок читає, presentation віддає у контракті | ✓ — окрема таблиця курсів з можливістю історії | ✓ — міграція 0004, нова колонка |

4 з 4 → ADR.

## Драйвери рішення

- CONTEXT.md: «rate snapshot — курс до base currency, зафіксований на витраті один раз для перерахунку. NOT „живий" біржовий курс».
- CONTEXT `## Invariants`: «Витрата завжди зберігає суму й валюту введення; будь-який перерахунок — окремий шар поверх, не мутація витрати» — курс має бути атрибутом поруч із сумою, не заміною суми.
- PRD §3 (історія курсів — non-goal), §5 AC-05 (заміна без збереження попереднього), AC-08 (finished не блокує), §9 Migration impact («одне nullable-поле на `expenses`»).
- sad.md §2: effort S і жовтневий дедлайн — мінімальна дельта схеми й коду.

## Розглянуті варіанти

1. **Nullable-колонки `rate_nano BIGINT NULL CHECK (rate_nano > 0)` і `rate_set_at TIMESTAMPTZ NULL` на `expenses` + поля `rate?: Rate`, `rateSetAt?: Date` на `Expense` + use case `SetExpenseRate`.** `AddExpense` приймає необов'язковий курс; `SetExpenseRate` знаходить витрату (`findById` — новий метод репозиторію), замінює курс через `expense.withRate()` (перезаписує й `rateSetAt = now` — час останнього задання, не журнал; потрібен для KPI PRD §7 «курс у день витрати») і зберігає тим самим upsert. Статус поїздки **не** перевіряється — це не додавання витрати. Обидва use case-и приймають курс лише коли у поїздки вже є base currency (`TripBudgetPort`), інакше `BaseCurrencyNotSetError` → 422 — курс «до нічого» неможливий.
2. **Окрема таблиця `expense_rates(expense_id PK → expenses, rate_nano, set_at)`.** `expenses` не чіпаємо; історія курсів у майбутньому — зняти PK і додавати рядки. Ціна: другий репозиторій, JOIN у `findByTrip` на кожному підсумку, дві сутності для одного факту «витрата має курс», і все це заради історії, яку PRD виключив.

## Результат рішення

**Обрано:** Варіант 1 — колонка на `expenses`, атрибут `Expense`, окремий use case для заміни.

**Чому переміг:** курс за словником — властивість витрати, зафіксована один раз, без власного життєвого циклу; отже, йому місце поруч із `amount_minor`/`currency`, а не в окремій таблиці. Одна expand-only міграція, один новий use case і один новий метод репозиторію вкладаються в S. Відсутність перевірки `TripStatusPort` у `SetExpenseRate` прямо реалізує AC-08 і не зачіпає інваріант «finished блокує нові витрати».

## Наслідки

**Позитивні:**
- Мінімальна дельта: одна колонка, `save` (upsert) переюзається для заміни курсу.
- AC-08 виходить природно — правка атрибуту не проходить через state-машину поїздки.
- Сума й валюта введення незмінні: `withRate()` повертає копію з іншим курсом, більше нічого не торкаючись (Invariants).

**Негативні:**
- `ExpenseRepository` отримує `findById` → змінюються `PostgresExpenseRepository`, `InMemoryExpenseRepository` і фейки у тестах.
- Дві нові помилки у `expenses` (`ExpenseNotFoundError` → 404, `BaseCurrencyNotSetError` → 422) — мапінг у presentation росте на два рядки.
- Друга колонка (`rate_set_at`) понад «одне nullable-поле» з PRD §9 — back-port у PRD (sad.md §11).

**Нейтральні:**
- Якщо історія курсів колись знадобиться — міграція на варіант 2 з перенесенням поточних значень; дешево за обсягом даних, але зміна схеми та репозиторію.

## Дельта даних

- `migrations/0004_add_expense_rate.sql` — `ALTER TABLE expenses ADD COLUMN rate_nano BIGINT NULL CHECK (rate_nano > 0), ADD COLUMN rate_set_at TIMESTAMPTZ NULL`; expand-only; backfill: **немає** (курс 1 для base currency — похідне правило, ADR-0003). Тип і шкала `rate_nano` — ADR-0002.

## Links

- PRD: [[../PRD.md]] §4 US-01/US-04/US-06, §5 AC-01/AC-02/AC-05/AC-08, §9 Migration impact
- SAD: [[../sad.md]] §4 Стратегія (стовп 1 — звідки тригернувся цей ADR) · §5 Building blocks (`SetExpenseRate`, `findById`, міграція 0004) · §8 Persistence & migrations
- Сусідній ADR: [[0002-shared-rate-as-bigint-scaled-1e9-half-up]] — тип і шкала цієї колонки; разом утворюють договір «де лежить курс і як він зберігається»
- Сусідній ADR: [[0003-expenses-counted-means-has-effective-rate]] — хто і як читає збережений тут курс
- Інваріант словника: «Витрата завжди зберігає суму й валюту введення; будь-який перерахунок — окремий шар поверх, не мутація витрати» — захищає: курс лягає атрибутом поруч, сума не мутує
