# PROMPT.md · Ralph · trip-budget T1 (Balance)

## Контекст

Репо trip-ledger: REST API для поїздок і витрат, TypeScript + Node 22, Express 5, vitest, Clean Architecture з BC `trips` / `expenses` і спільним `src/shared/`. Кожна ітерація стартує з нуля, пам'яті між ними немає — стан бери тільки з диска.

Перед роботою прочитай, саме в такому порядку:

1. `.ralph-feedback.txt` у корені, якщо він є: це вивід `check.sh` з минулої ітерації, почни з нього.
2. `git log --oneline -5` і `git status`: що вже зроблено до тебе.
3. `CLAUDE.md`: dependency rule і конвенції (value object = клас, інваріанти в конструкторі).
4. `docs/features/trip-budget/tasks/T1-balance-value-object.md`: story і DoD.
5. `docs/features/trip-budget/adr/0004-signed-balance-value-object-in-shared.md`: чому `Money` не чіпаємо.
6. `src/shared/Money.ts` і `src/shared/Money.test.ts`: еталон стилю.
7. `ralph/T1-balance/acceptance.test.ts`: приймальний зонд, реалізація має його пройти.

## Завдання

Додати `src/shared/Balance.ts` — знаковий value object (ціле число мінорних одиниць, може бути від'ємним, + валюта) з API `new Balance(amount, currency)`, `Balance.of(money)`, `minus(money)`, `isNegative()` — і юніт-тести до нього в `src/shared/Balance.test.ts`.

## Критерій завершення

Готово = `bash ralph/T1-balance/check.sh` повертає exit 0 і друкує `PASS`. Нічого іншого як «готово» не рахується.

Порядок:

1. Код і тести → `npx vitest run src/shared ralph/T1-balance` → `npx tsc --noEmit`.
2. У `docs/features/trip-budget/tasks/tracker.md` зміни статус T1 з `todo` на `review` — тільки цю клітинку.
3. `git add src/shared/Balance.ts src/shared/Balance.test.ts docs/features/trip-budget/tasks/tracker.md`, потім `git commit -m "feat(shared): T1 Balance — знаковий value object"`. Якщо коміт уже є з минулої ітерації — новий коміт `fix(shared): T1 …`, без amend.
4. `bash ralph/T1-balance/check.sh`. Exit 0 → `touch DONE` і закінчуй відповідь. Не 0 → виправляй у межах цієї ж ітерації.

Якщо `check.sh` червоний з причини, яку ти не можеш виправити у своїх двох файлах (зонд суперечить story, падає чужий тест, бракує залежності), — не обходь це. Створи `BLOCKED.md` у корені з одним абзацом причини і закінчуй без `DONE`.

## Не роби

- Не змінюй `ralph/`, `src/shared/Money.ts`, `src/shared/Money.test.ts`, story-файли, `CLAUDE.md`. Якщо тест падає — виправляй код, а не тест.
- Не став залежностей: property-тест робиш на детермінованому генераторі з seed, без fast-check.
- `shared/` нічого не імпортує з `trips/` чи `expenses/`.
- Не створюй `DONE`, поки `check.sh` не повернув 0: обв'язка все одно перезапустить перевірку і зніме `DONE`, якщо вона червона.
- У git — тільки `status` / `diff` / `log` / `add` / `commit`. Без push, reset, checkout, amend.
