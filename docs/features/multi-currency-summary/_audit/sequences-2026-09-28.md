# Sequence coverage audit — multi-currency-summary (2026-09-28)

Skill: `complete-sequence-diagrams` (sdlc plugin v4.5.1). Size: S (frontmatter PRD/SAD). Прогін перед `schema-forge`: data-model читає persist-кроки й запити саме з цих flows.

## Класифікація sync / async

Ключових слів async у PRD немає. US-06 «пачкою доставити курси» — не черга і не job: у SAD §5 немає batch-ендпойнта, «пачка» = N послідовних викликів `SetExpenseRate` від owner-а → sync. Idempotency-key / retry / DLQ не потрібні.

## Use-case pass (PRD §4)

| User story | Status | Де показано |
|---|---|---|
| US-01 Курс на витраті | Covered | flow 1 |
| US-02 Чесний загальний підсумок | Covered | flow 2 |
| US-03 Масштаб дірки | Covered | flow 2 (`withoutRate`) |
| US-04 Виправити курс | Covered | flow 3, частина 1 |
| US-05 Не вводити очевидне | Covered | flow 1, `Note` про ефективний курс 1 |
| US-06 Дозаповнити постфактум | Trivial | flow 3, частина 1 у finished поїздці; пачка = повтор того самого шляху |

## AC pass (PRD §5)

| AC | Status | Де показано |
|---|---|---|
| AC-01 курс зберігається | Covered | flow 1, «зберегти витрату (… rate_nano + rate_set_at …)» |
| AC-02 курс ≤ 0 | Covered | flow 1, `alt курс нульовий або від'ємний` |
| AC-03 сирі суми + converted total | Covered | flow 2 |
| AC-03b дрібна валюта | Trivial | flow 2, `Rate.apply` half-up — точність, не окремий шлях |
| AC-04 лічильник без курсу | Covered | flow 2 |
| AC-05 заміна курсу без історії | Covered | flow 3, частина 1 |
| AC-06 авто-курс 1 | Covered | flow 1, `Note over E` |
| AC-07 незмінна base currency | Covered | flow 3, частина 2 (`RatedExpensesPort`) |
| AC-08 finished не блокує | Covered | flow 3, `Note` «статус поїздки НЕ перевіряється» |
| AC-09 залишок бюджету лікується | Covered | flow 2, `Note` про спільну `BudgetBlock` |

Разом: 6/6 US, 10/10 AC (9 Covered, 1 Trivial, 0 Missing) — нових flows не додано.

## Edits-log

- Нових блоків немає (Missing = 0).
- Backstop-валідація кроку 8: flows 1–3 не парсились — `;` у тексті повідомлень і `Note` (9 рядків: 201, 206, 236, 240, 264, 265, 269, 275, 285). Виправлено лише синтаксис (`;` → `,` / `—` / дужки / крапка), зміст не змінено.
- Mermaid-перевірка: `mermaid@11` `parse()` — 5/5 блоків `sad.md` OK (2 C4 + 3 sequence).
- Persist-кроки для data-model: flow 1 «зберегти витрату (rate_nano + rate_set_at або NULL)», flow 3 «знайти витрату» по id + «зберегти витрату (upsert)», «зберегти поїздку з новою base currency»; запит flow 3 «є витрати з явним rate snapshot?» → `expenses` по `trip_id` + `rate_nano IS NOT NULL`.
