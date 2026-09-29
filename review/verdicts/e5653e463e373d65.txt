T6-add-expense-and-summary-budget · clean-reviewer · packet-2   (opus, свіжий екземпляр, 2 tool uses, 68 с, ~76k токенів)
Вердикт: WARN
F1 [minor] What — budget читається ДО save(): падіння порту → витрату не прийнято; раніше AddExpense від budget не залежав
F2 [minor] AC-04 — existing читаються до save(): два паралельні POST не бачать один одного → обидва overspend:false; стан коректний, страждає лише сигнал
F3 [minor] scope — createApp уже зшиває BudgetPort; GET /summary читає budget і викидає до T11 → зайва латентність
F4 [minor] AC-05 — «заміна» = присвоєння у фейку; реальний шлях SetTripBudget не бере участі

## Розбір (мій) — зупинка
- F1 — trade-off мого ж фіксу F2 з packet-1. Свідомий вибір: retry-safety > доступність. Нової залежності фактично немає: tripStatus.exists()/canAcceptExpenses() уже до save() ходять у той самий trips.
- F2 — справжня гонка сигналу → accepted debt у Notes T6 (закривати транзакцією/SELECT … FOR UPDATE разом з T3/T7, коли з'явиться Postgres-шлях budget).
- F3 — відомо, T11 почне використовувати budget; F4 — реальний шлях заміни покриє T13 (e2e).
- Зонд після фіксу: FLAKY POST 500 · stored 0 → RETRY 201 · stored 1 (дубля немає), дріт не змінився.
