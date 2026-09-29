# SHR-1 у фоновій сесії — процес зі страхувальною сіткою (урок 7.5)

Story: [SHR-1 — value object `Rate`](../../docs/features/multi-currency-summary/tasks/SHR-1-rate-value-object.md).
Базова точка: `bc0e0e7` (зонд [`acceptance.test.ts`](./acceptance.test.ts) закомічено RED до старту).
Результат: `54422bd feat(shared): SHR-1 …` → story у `wip` на рев'ю (див. Notes story).

## Рівень і чому

**Фонова сесія `claude --bg` з активним `/goal` усередині** + **`/loop 3m` як сторож** у моїй сесії.

- Задача разова, а не регулярна → хмарний `/schedule` і десктопна задача не про неї; `/bg` — щоб агент робив story, поки я зайнятий іншим.
- Хмара не підійшла б і технічно: гілка `lesson-7.5-background` і базовий SHA на момент старту існували лише локально, `node_modules` — junction поза git, `.env` під `.gitignore`.
- Сторож — окремий рівень (`/loop`) над фоновою сесією: видимість + стеля часу, якої `--bg` сам не має.

## Шари сітки

| Шар | Як реалізовано | Спрацював? |
|---|---|---|
| Ізоляція | git worktree `../trip-ledger-shr1` на гілці `claude/shr-1-rate`, junction `node_modules` | так — у робочій копії `lesson-7.5-background` нічого не змінилось до мого `merge --ff-only` |
| Умова зупинки | `/goal` з 7 перевірками + `or stop after 12 turns` ([goal.txt](./runs/goal.txt)) | так — `goal_status met: true` після 1 оцінки, сесія сама перейшла в `idle/done` |
| Мінімум прав | `--permission-mode dontAsk`, allowlist (Read/Edit/Write/Glob/Grep, vitest, tsc, grep, git status/diff/log/add/commit), deny `git push`, WebFetch, WebSearch, `--setting-sources project,local` | так — 20 відмов, серед них 2 спроби прочитати `~/.claude/settings*.json` |
| Стеля витрат | **немає вбудованої**: `--max-budget-usd` працює лише з `--print`. Замість неї — sonnet, ліміт ходів у `/goal`, сторож `claude stop` після 20 хв у `working` | не знадобився: 6 хв |
| Видимість | `claude agents --json` у сторожі кожні 3 хв ([watchdog.tsv](./runs/2026-09-29-watchdog.tsv)), `scripts/bg-watchdog.sh` | так — саме дашборд показав, що перший запуск сів у `idle/blocked` |
| Перевірка реального стану | незалежний прогін vitest/tsc/grep + читання `git diff bc0e0e7` + 2 edge-проби | так — знайшов 2 відхилення, яких не бачили ні зонд, ні оцінювач |

## Прогін

| | |
|---|---|
| Запуск 1 | `backgrounded · 49bfef2c … (idle — send a prompt to start)` — промпт стояв після `--disallowedTools <tools...>` і був проковтнутий варіадичним прапором як ще один «інструмент». Сесія жива, але нічого не робить: стан `idle/blocked`. `claude stop` + `claude rm`. |
| Запуск 2 | промпт одразу після `--bg`, списки інструментів через кому → `f4715773` |
| Тривалість | 15:45:50 → 15:50:38 (~4 хв 48 с) |
| API-ходів | 38 (sonnet-5), оцінок `/goal` — 1 (`met: true`) |
| Токени | ~3.19M cache read, ~160k cache write, ~19k output |
| Відмови дозволів | 20 — 12 з них на `…; echo "EXIT:$?"` (та сама грабля, що в 7.3), решта: `find`, `make lint`, `npx tsc`, `node -e`, `ls`, Read `~/.claude/settings.json` / `settings.local.json` |
| Ручні втручання | 0 під час прогону |
| Результат | `src/shared/Rate.ts` + `Rate.test.ts`, +112; повний vitest 98/98, tsc 0 |

## Ревізія після завершення

- **Дашборд:** до старту — 16 сесій (15 interactive idle, найстаріша — 4 дні), фонових 0; після — 17, з них 1 `background/idle/done` ([знімок](./runs/2026-09-29-agents-snapshot.json)). Перша, «порожня» фонова сесія прибрана `claude rm`, тож у дашборді не висить. 15 простійних interactive — це desktop-сесії з інших задач, не наслідок цього процесу, але саме той «витік», від якого дашборд і має рятувати.
- **Запобіжник розкладу:** сторож-cron мав термін життя 7 днів, але зупинився раніше — `CronDelete` за умовою «status idle». У оточенні desktop-сесії змінна `CLAUDE_CODE_DISABLE_CRON` присутня, але порожня — рубильник не ввімкнено.
- **Diff проти підсумку агента:** оцінювач зарахував усі 7 пунктів, мій прогін це підтвердив. Але в diff:
  1. `apply` конвертує через `+result.toString()` — формально обходить мій же `grep "Number\("`, а по суті `Money` не перевіряє `isSafeInteger`: `(2⁵³−1) × 3` → `…972` замість `…973`, без помилки (edge-case story).
  2. `PATTERN` не обмежує цілу частину 9 цифрами, як контракт: `Rate.parse("1234567890.5")` проходить.
  3. `Rate.test.ts` — майже копія зонду; юніт-тест нового покриття не додав.
