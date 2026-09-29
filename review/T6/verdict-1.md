T6-add-expense-and-summary-budget · clean-reviewer · packet-1   (opus, 2 tool uses, 68 с, ~71k токенів)
Вердикт: WARN
F1 [minor] AC-05 — «заміна budget» = два окремі use case з різними фейк-портами; before/after з InMemory findByTrip — якщо ті самі посилання, toEqual пройде і при мутації → тест не може впасти
F2 [minor] AC-04/QG-3 — після save() ще tripBudget.budget() і findByTrip(): виняток → 500 при збереженій витраті → повтор клієнта = дубль
F3 [minor] scope — TripRepositoryBudgetPort уже зшито в createApp (у трекері це T12) — T12 має це врахувати

## Видимий канал + зонди (мої, review/T6/http.probe.ts → http.probe.log)
- Форма дроту не змінилась: POST 201 {amount,category,id,spentAt,tripId}; summary — масив.
- F2 ПІДТВЕРДЖЕНО: FLAKY POST 500 · stored 1 → RETRY POST 201 · stored 2. Для цілісності грошей піднімаю до major.
- F1 ПІДТВЕРДЖЕНО: InMemoryExpenseRepository віддає ті самі посилання (SAME REF true) → AC-05-тест тавтологічний.
- F3 — нотатка в story/T12, не код.
