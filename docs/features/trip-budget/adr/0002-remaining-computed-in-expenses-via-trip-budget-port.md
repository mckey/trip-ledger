---
status: Accepted
owner: "Vladimir Makarov"
reviewers: []
updated_at: "2026-09-02"
feature_size: S
stage: "04-05"
ticket: "-"
---

# 0002 — Рахувати remaining і uncounted у BC `expenses` через порт `TripBudgetPort`

- **Status:** Accepted
- **Date:** 2026-09-02
- **Deciders:** Vladimir Makarov (owner фічі, архітектор) — Socratic walk `architecture-design`

## Контекст

Remaining = budget − Σ counted expenses: budget живе у `trips` (ADR-0001), витрати — у `expenses`. AC-05 вимагає, щоб зміна budget не мутувала жодну витрату, а інваріант словника — щоб «будь-який перерахунок був окремим шаром поверх». Питання: у якому модулі й через який шов рахувати блок залишку, не порушуючи dependency rule з CLAUDE.md.

Варіант «рахувати у `trips`» виключений існуючим обмеженням, а не розглядається як альтернатива: ARCHITECTURE.md фіксує, що `trips` нічого не знає про витрати, і зворотний порт `trips → expenses` створив би двосторонню залежність між BC.

Масштаб удару: рішення видно **обом модулям** і presentation, є **чесні альтернативи** (композиція у presentation; розширення існуючого порту), а переробка після появи multi-currency-summary, яка спирається на той самий блок, — понад 3 дні. → ADR.

## Драйвери рішення

- CONTEXT.md `## Invariants`: «Витрата завжди зберігає суму й валюту введення; будь-який перерахунок — окремий шар поверх, не мутація витрати».
- PRD §5 AC-05 (cross-context): remaining порахований відносно budget саме цієї поїздки; зміна budget не мутує витрати.
- CLAUDE.md: `application/` отримує залежності лише через інтерфейси з `domain/`; BC спілкуються через порти — наявний прецедент `TripStatusPort` → `TripRepositoryStatusPort` (Explore §c/§e).
- sad.md §1 QG-2: підсумок p95 ≤ 250 ms — обчислення in-process, без додаткових мережевих стрибків.
- PRD trip-budget §3 і PRD multi-currency-summary AC-09: наступна фіча має живити converted total і remaining «з одного джерела» — блок має бути однією чистою функцією.

## Розглянуті варіанти

1. **Чиста функція `BudgetBlock` у `expenses/application` + новий порт `TripBudgetPort` у `expenses/domain` з адаптером `TripRepositoryBudgetPort` в `expenses/infrastructure`.** `GetTripSummary` і `AddExpense` викликають порт, отримують budget (або `null`) і рахують блок над уже завантаженими витратами. Дзеркало наявного `TripRepositoryStatusPort`.
2. **Композиція у presentation.** `expensesRouter` (або `app.ts`) сам викликає `GetTrip` з `trips` і `GetTripSummary` з `expenses` і рахує remaining. Жодних нових портів, але доменна арифметика й правило «counted = у base currency» опиняються у шарі HTTP — прямо проти конвенції CLAUDE.md про те, де живе логіка.
3. **Розширити існуючий `TripStatusPort` методом `budget(tripId)`.** Менше файлів, але один порт починає відповідати за два різні питання (стан життєвого циклу і план), і кожен fake у тестах `AddExpense` мусить імітувати budget, навіть коли тест про статус.

## Результат рішення

**Обрано:** Варіант 1 — окремий `TripBudgetPort` і чиста функція `BudgetBlock` у `expenses`.

**Чому переміг:** зберігає напрямок залежності `expenses → trips` через інтерфейс (як уже зроблено для статусу), тримає арифметику залишку в application-шарі, де вона тестується без Express і БД, і дає єдину точку, яку `AddExpense` (overspend signal, ADR-0003) і `GetTripSummary` (блок підсумку) використовують однаково — саме це «одне джерело», якого вимагає наступна фіча. Окремий порт замість розширення `TripStatusPort` — щоб тести статусу не тягнули budget, а тести budget — статус.

## Наслідки

**Позитивні:**
- Dependency rule не порушується; нових напрямків залежності немає.
- `BudgetBlock` — чиста функція `(budget, expenses[]) → { remaining, counted, uncounted, overspend }`, юніт-тестується напряму (QG-1, QG-3).
- multi-currency-summary розширить ту саму функцію (counted = має rate snapshot), не додаючи другого агрегата.

**Негативні:**
- Форма відповіді `GetTripSummary` змінюється з масиву `TripSummaryLine[]` на об'єкт `{ lines, budget }` — breaking change для клієнта й наявних supertest-тестів (sad.md §11).
- `AddExpense` робить два in-process виклики до `trips` (статус + budget) замість одного — прийнятно за QG-2, зафіксовано як accepted debt у §11.

**Нейтральні:**
- Адаптер `TripRepositoryBudgetPort` читає `TripRepository.findById()` — той самий шлях, що і статус; за потреби обидва адаптери можна злити в один клас із двома інтерфейсами без зміни домену.

## Links

- PRD: [[../PRD.md]] §5 AC-03/AC-03b/AC-05/AC-06/AC-06b, §2 Goals («залишок живе у підсумку»)
- SAD: [[../sad.md]] §4 Стратегія (стовп 2), §5 Building blocks (`TripBudgetPort`, `BudgetBlock`, `TripRepositoryBudgetPort`), §8 Cross-BC access
- Сусідній ADR: [[0001-budget-as-columns-on-trips]] — де лежить budget, який читає цей порт
- Сусідній ADR: [[0003-overspend-signal-inline-in-add-expense-response]] — другий споживач `BudgetBlock`
- Сусідній ADR: [[0004-signed-balance-value-object-in-shared]] — тип поля `remaining`
