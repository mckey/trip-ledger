---
status: Accepted
owner: "Vladimir Makarov"
reviewers: []
updated_at: "2026-09-02"
feature_size: S
stage: "03"
ticket: "-"
bc: "cross"
---

# 0004 — Задавати base currency окремо від budget і блокувати її зміну через зворотний порт `RatedExpensesPort` (`trips → expenses`)

- **Status:** Accepted
- **Date:** 2026-09-02
- **Deciders:** Vladimir Makarov (owner фічі, архітектор) — Socratic walk `arch-forge`

## Контекст

У trip-budget base currency з'являлась лише разом із budget: «перше задання budget фіксує base currency» (її ADR-0001), а міграція 0003 закріплює це CHECK-ом `(budget_minor IS NULL) = (base_currency IS NULL)`. Ця фіча потребує base currency і для поїздки **без** бюджету: без неї немає «ефективного курсу 1» (AC-06) і немає converted total. Крім того, AC-07 вимагає блокувати зміну base currency, поки у поїздки є хоча б одна витрата з курсом — а це факт BC `expenses`, тоді як зміна відбувається у BC `trips`. Зараз між BC існує лише один напрямок порту: `expenses → trips` (`TripRepositoryStatusPort`).

Виключено обмеженням: прямий імпорт `trips → expenses` (CLAUDE.md) і перевірка правила у presentation (композиція у роутері — доменне правило в HTTP-шарі, анти-патерн CLAUDE.md).

## Радіус впливу (4 критерії)

| Незворотнє (≥ 3 днів) | ≥ 2 модулі | Чесна альтернатива | Зачіпає базу |
|---|---|---|---|
| ✓ — новий напрямок залежності — рішення про форму репо, відкат = переписати use case, адаптер і зшивання | ✓ — `trips` (сутність, use case, адаптер), `expenses` (порт читає репозиторій), presentation, документи trip-budget | ✓ — заборонити зміну взагалі; перенести власність над base currency | ✓ — послабити CHECK з міграції 0003 |

4 з 4 → ADR; зворотний порт — ADR завжди, незалежно від підрахунку.

## Драйвери рішення

- PRD §5 AC-06 (курс 1 для base currency сам), AC-07 (зміна base currency блокується, поки є курси; «спершу поїздка без курсів, потім зміна валюти» — отже зміна без курсів має бути можливою).
- CONTEXT.md: «base currency — валюта, у якій задається бюджет поїздки і рахується перевитрата» — атрибут поїздки, не бюджету.
- CLAUDE.md: BC спілкуються тільки через порти з адаптерами в `infrastructure/`; прецедент `TripRepositoryStatusPort`.
- trip-budget ADR-0001 і її §11: «зміни base currency у v1 немає — помилкову валюту доведеться правити руками» — біль, який AC-07 закриває правильно.
- sad.md §1 QG-3: інваріанти у типах, не в домовленостях.

## Розглянуті варіанти

1. **Base currency — самостійний атрибут; блокування через зворотний порт.** `CreateTrip` приймає необов'язкову `baseCurrency`; новий use case `SetTripBaseCurrency`; `Trip.setBaseCurrency(currency, hasRatedExpenses)` кидає `BaseCurrencyLockedError`, якщо є витрати з курсом. Факт «є витрати з курсом» — порт `RatedExpensesPort { hasRatedExpenses(tripId) }` у `trips/domain` з адаптером `ExpenseRepositoryRatedPort` у `trips/infrastructure` поверх `ExpenseRepository` — дзеркало `TripRepositoryStatusPort`. `SetTripBudget` лишається сумісним: фіксує base currency, якщо вона ще не задана. CHECK з 0003 послаблюється до `(budget_minor IS NULL OR base_currency IS NOT NULL)`.
2. **Заборонити зміну base currency назавжди після першого задання.** Жодного зворотного порту, найпростіше. Але AC-07 явно передбачає зміну для поїздки без курсів, а помилково введена валюта лишає owner-а з ручними правками у БД — саме той біль, який trip-budget §11 уже зафіксувала.
3. **Перенести власність над base currency у BC `expenses`** (окрема таблиця «налаштувань поїздки», якою володіє `expenses`). Порт не потрібен — усі факти в одному BC. Але поїздка — сутність `trips`; її валюта в чужому контексті ламає межі, а `SetTripBudget` (у `trips`) починає залежати від `expenses` — той самий зворотний зв'язок, лише прихований.

## Результат рішення

**Обрано:** Варіант 1 — самостійний атрибут + зворотний порт із адаптером за наявним прецедентом.

**Чому переміг:** зберігає AC-07 дослівно й лишає base currency там, де їй місце за словником. Механізм не новий — той самий «порт у domain споживача + адаптер у infrastructure», лише у другий бік; нове тут лише те, що зв'язок стає двонапрямним, і саме це ADR робить явним і ревʼюваним замість тихого імпорту. Зшивання обох напрямків живе в одному місці — `app.ts`.

## Наслідки

**Позитивні:**
- AC-06/AC-07 виконуються і для поїздок без бюджету; trip-budget flow «задати budget» лишається робочим без змін для owner-а.
- Помилкову base currency можна виправити, поки немає курсів — закриває ризик з trip-budget §11.
- Правило живе в `Trip.setBaseCurrency`, тестується без БД і Express з фейковим портом.

**Негативні:**
- Перший двонапрямний зв'язок між BC через порти: без інструментального контролю наступний крок — прямий імпорт. Борг «eslint `import/no-restricted-paths`» (docs/adr/0001) стає терміновим — підключити разом із фічею (sad.md §11).
- `TripBudgetPort` з trip-budget розширюється до `{ baseCurrency, budget }` — правка її SAD §5 при реалізації.
- CHECK із міграції 0003 треба послабити — якщо 0003 уже застосована, це `ALTER TABLE … DROP CONSTRAINT / ADD CHECK` у 0004.

**Нейтральні:**
- Обидва адаптери (`TripRepositoryStatusPort`, `ExpenseRepositoryRatedPort`) можна пізніше зібрати в один «anti-corruption» модуль без зміни доменів.
- `CreateTrip` без `baseCurrency` лишається валідним — base currency можна задати пізніше.

## Дельта даних

- Нових колонок немає — використовує `trips.base_currency` з міграції 0003 (trip-budget).
- `migrations/0004_add_expense_rate.sql` послаблює CHECK: `(budget_minor IS NULL) = (base_currency IS NULL)` → `(budget_minor IS NULL OR base_currency IS NOT NULL)`; expand-only; backfill немає.

## Links

- PRD: [[../PRD.md]] §5 AC-06/AC-07, §3 Non-goals (мультивалютний бюджет — base currency лишається однією)
- SAD: [[../sad.md]] §5 Building blocks (`SetTripBaseCurrency`, `RatedExpensesPort`, `ExpenseRepositoryRatedPort`) · §8 Cross-BC access · §11 (ризик двонапрямного зв'язку)
- Сусідній ADR: [[0003-expenses-counted-means-has-effective-rate]] — навіщо base currency потрібна без budget
- Сусідній ADR (інша фіча): [[../../trip-budget/adr/0001-budget-as-columns-on-trips]] — уточнює: «перше задання budget фіксує base currency» → «…якщо вона ще не задана»
- Інваріант словника: «Budget ніколи не блокує додавання витрати» — не зачеплено (блокується зміна валюти, не витрата); правило AC-07 — кандидат у `## Invariants` через `fix-term`
