---
status: Living
updated_at: "2026-09-29"
---

# Domain Context — multi-currency-summary

<!--
Per-feature словник (task-forge Stage 0). База — кореневий CONTEXT.md і trip-budget/CONTEXT.md;
тут терміни фічі + уточнення, які ця фіча вносить у чужі визначення (SAD §11, ризик «словник перевизначається»).
Back-port уточнень у кореневий і trip-budget словники — story DOC-1.
-->

## Glossary

- rate snapshot — курс до base currency, записаний на витраті; змінюється лише явною заміною owner-ом, попереднє значення не зберігається. NOT «живий» біржовий курс і NOT журнал курсів (історії немає свідомо).
- effective rate — курс, з яким витрата входить у перерахунок: явний rate snapshot або 1, якщо валюта витрати збігається з base currency. NOT rate snapshot (курс 1 ніде не записується — він похідний).
- converted total — сума перерахованих витрат поїздки в base currency, лише з витрат з effective rate. NOT raw totals (там суми без перерахунку, кожна у своїй валюті).
- raw totals — суми по категорії й валюті рівно так, як витрати ввели. NOT converted total (raw totals лишаються для звірки з чеками, total їх не замінює).
- without-rate count — кількість витрат поїздки без effective rate, показана поруч із converted total. NOT невалідні витрати (вони збережені й валідні — система лише чесно каже, що total неповний).
- counted expense — витрата з effective rate: входить і в converted total, і в порівняння з budget. NOT «витрата у base currency» (так counted визначала trip-budget до цієї фічі).
- base currency — валюта поїздки, до якої фіксуються курси і в якій рахується budget; задається сама по собі, без budget. NOT валюта введення витрати і NOT частина budget.
- base currency lock — стан поїздки, у якому змінити base currency не можна, бо хоча б одна витрата має явний rate snapshot. NOT finished (finished забороняє нові витрати, lock — лише зміну валюти поїздки).
- дозаповнення курсу — задання або заміна курсу на вже збереженій витраті, зокрема у finished поїздці. NOT додавання витрати (його finished забороняє, а дозаповнення — ні) і NOT міграційний backfill (курс 1 міграцією свідомо не проставляється — ADR-0003).

## Invariants

- Rate snapshot завжди додатний; приймається з точністю до 9 знаків після коми (AC-02, ADR-0002).
- Перерахунок ніколи не мутує витрату: сума й валюта введення незмінні, converted total — значення відповіді, а не запис (AC-05, SAD QG-3).
- Converted total і remaining завжди рахуються з однієї множини counted expenses — розійтись вони не можуть (AC-09, ADR-0003).
- Base currency не змінюється, поки в поїздці є хоча б одна витрата з явним rate snapshot; перше задання дозволене завжди (AC-07, ADR-0004).
- Курс на витрату приймається лише тоді, коли у поїздки вже є base currency — курсу «до нічого» не буває (ADR-0004).
- Finished забороняє додавати витрати, але не забороняє дозаповнення курсу на наявних (AC-08, ADR-0001).
- Округлення перерахунку — half-up, похибка не більше 1 minor unit на витрату; дрібна валюта в нуль не округлюється (PRD §6, AC-03b, ADR-0002).

## Sentinel errors

Код на дроті — `<bc>.<snake(Class без Error)>` (contract-forge); джерело — [api-sync-report · Error codes](./contracts/api-sync-report.md#error-codes).

| Class | code | HTTP | BC / хто кидає |
|---|---|---|---|
| — (zod на межі) | `http.validation_failed` | 422 | presentation: курс ≤ 0, > 9 знаків, не рядок-число (AC-02) |
| — (API-key middleware) | `http.unauthorized` | 401 | presentation, успадковано з trip-budget |
| `TripNotFoundError` | `expenses.trip_not_found` | 404 | expenses: `AddExpense` (є в коді); підсумок невідомої поїздки as-built повертає 200 з порожніми рядками — у контракті `getTripSummary` лише 200/401 |
| `TripNotAcceptingExpensesError` | `expenses.trip_not_accepting_expenses` | 409 | expenses: `AddExpense` у finished (є в коді) |
| `BaseCurrencyNotSetError` | `expenses.base_currency_not_set` | 422 | expenses: `AddExpense` / `SetExpenseRate` з курсом, коли у поїздки немає base currency (новий) |
| `ExpenseNotFoundError` | `expenses.expense_not_found` | 404 | expenses: `SetExpenseRate` (новий) |
| `BaseCurrencyLockedError` | `trips.base_currency_locked` | 409 | trips: `Trip.setBaseCurrency` через `SetTripBaseCurrency` (новий) |
| `TripDoesNotExistError` | `trips.trip_does_not_exist` | 404 | trips: `SetTripBaseCurrency` (з trip-budget) |

## Scope-filter invariant

Аналог org-filter для single-user інструмента — чим обмежене кожне читання й запис:

- API key (`X-API-Key` = `API_KEY`) перевіряється до будь-якого звернення до сховища; без нього — 401 без деталей (trip-budget SAD §8).
- Кожне читання витрат обмежене поїздкою: підсумок і `RatedExpensesPort` читають лише `WHERE trip_id = $1`; витрати інших поїздок у перерахунок не потрапляють ніколи.
- Факти чужого BC — лише через порт (`TripStatusPort`, `TripBudgetPort` у напрямку expenses → trips; `RatedExpensesPort` у напрямку trips → expenses); зшивання обох напрямків — лише в `src/presentation/app.ts` (ADR-0004).
- Запис у відсутню поїздку чи витрату — 404 без подробиць про інші дані (коди — таблиця вище; гілки — api-sync-report F2/F3); читання підсумку невідомої поїздки поводиться as-built.

## Out of scope

- Автоматичні курси із зовнішніх джерел — інваріант кореневого словника.
- Історія курсів і перерахунок «станом на сьогодні» — курс є атрибутом витрати (PRD §3, ADR-0001).
- Мультивалютний budget — budget лишається однією сумою в base currency (PRD §3).
- Окремий екран пачкового дозаповнення — поки правка по одній витраті (PRD §8 OQ #2, після першої поїздки з фічею).
- Rate-limit 60/хв на правки курсу — у v1 без ліміту, єдиний клієнт за API key (api-sync-report · Closed open questions).
