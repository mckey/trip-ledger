---
type: tracker
feature: <slug>
updated_at: YYYY-MM-DD
---

# Tracker — <slug>

Плоский стан для виконавця (runner). **Алгоритм вибору:** зверху вниз — перший рядок зі статусом `todo` або `wip` **без assignee** (кинута сесія), у якого **Blocked by** порожній або всі перелічені `done`, і всі **External** `done` у своєму трекері. Хвиля N+1 не стартує, поки story, від якої вона залежить, не `done` — навіть якщо «можна паралельно».

| Story | Wave | Status | Assignee | Blocked by | External | Estimate |
|---|---|---|---|---|---|---|
| [SHR-1](./SHR-1-….md) | 1 | todo | — | — | — | S |

## Status legend

- `todo` — можна брати, щойно блокери `done`.
- `wip` — у роботі. З assignee — не брати; без assignee — сесія впала, підхопити з першого незакритого кроку checklist.
- `done` — змерджено; розблоковує рядки, де вона у Blocked by.
- `blocked` — виконавець упав на кроці; причина — у секції «Notes» story-файлу.

## Next runnable

<!-- Результат алгоритму на момент генерації + що паралелиться. -->
