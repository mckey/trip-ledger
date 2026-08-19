# Architecture — trip-ledger

Clean Architecture, два bounded contexts, залежності тільки всередину.

```
        presentation (Express routes, zod-схеми, мапінг HTTP <-> DTO)
              |
              v
        application (use cases: CreateTrip, AddExpense, GetTripSummary)
              |
              v
        domain (сутності Trip/Expense, value objects, інтерфейси репозиторіїв)
              ^
              |
        infrastructure (PostgresTripRepository, PostgresExpenseRepository, міграції)
```

## Де яка логіка живе

| Питання | Шар |
|---|---|
| «Чи можна додати витрату у finished-поїздку?» | domain (метод на сутності Trip) |
| «Створи поїздку і поверни її» | application (use case) |
| «Як зберегти в Postgres» | infrastructure |
| «Як розпарсити body і віддати 422» | presentation |

## Bounded contexts

- `src/trips/` — життєвий цикл поїздки. Нічого не знає про витрати.
- `src/expenses/` — витрати; посилається на поїздку тільки через `tripId` (string). Перевірка «поїздка існує і не finished» — через порт `TripStatusPort`, оголошений у domain expenses, реалізований в infrastructure поверх trips.
- `src/shared/` — `Money`, `DateRange`. Без бізнес-логіки контекстів.

## Правило залежностей

domain не імпортує нічого зовнішнього; application бачить тільки domain; infrastructure і presentation — зовнішнє кільце. Деталі та заборони — у CLAUDE.md.
