# BC: expenses

Витрати в межах поїздки: сума (`Money` з shared), категорія, дата.

- `domain/` — сутність `Expense`, інтерфейси `ExpenseRepository` і `TripStatusPort` (перевірка «поїздка існує і не finished»).
- `application/` — use cases: `AddExpense`, `GetTripSummary`.
- `infrastructure/` — `PostgresExpenseRepository`, адаптер `TripStatusPort` поверх trips.
- `presentation/` — роути `/trips/:id/expenses`, `/trips/:id/summary`.

На BC `trips` посилається лише через `tripId` і порт — прямих імпортів немає.
