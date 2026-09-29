# T2 через `/goal` — умова, прогін, рев'ю (урок 7.3)

Story: [T2 — budget, base currency і setBudget() у Trip](../../docs/features/trip-budget/tasks/T2-trip-budget-domain.md).
Базова точка: `4e75763` (зонд `acceptance.test.ts` закомічено RED до старту цілі).

## Умова до мета-промптингу (мій чернетковий варіант)

```
/goal T2 done: npx vitest run src/trips goal/T2-trip-budget exits 0, npx tsc --noEmit exits 0, git diff lesson-7.3-goal -- goal/ is empty, or stop after 15 turns
```

## Що зловила окрема модель (sonnet, 12 ходів, $0.40 — `runs/2026-09-29-meta-prompt.json`)

- `git diff lesson-7.3-goal -- goal/` порівнює з гілкою, яка їде вперед з кожним комітом агента: закоміть він правку зонду — diff знову порожній. Треба SHA базової точки.
- `git diff` не бачить untracked-файлів — потрібен ще `git status --porcelain -- goal/`.
- `tsc` не ловить dependency rule (CLAUDE.md про це прямо пише), eslint-конфігу в репо немає — перевірки «domain не імпортує expenses/express/zod/pg» у чернетці нема взагалі.
- `CreateTrip.test.ts` / `FinishTrip.test.ts` мають лишитись зеленими **без змін** — чернетка перевіряє лише, що вони зелені.
- Немає захисту від `.only` / `.skip` і від послаблення `tsconfig.json`.
- «exits 0» без вимоги показати вивід — запрошення закрити ціль на прозі.

## Умова після мета-промптингу (запущена)

```
/goal T2 (docs/features/trip-budget/tasks/T2-trip-budget-domain.md) is done only when each check below was actually run in this session and its real output with exit code is shown in the transcript; a prose claim without the command output does not count: (1) `npx vitest run` (full suite) exits 0 and its output lists goal/T2-trip-budget/acceptance.test.ts and src/trips/domain/Trip.test.ts as passed; (2) `npx tsc --noEmit` exits 0; (3) `grep -rEn "from '(express|zod|pg)'|expenses/" src/trips/domain` prints nothing; (4) `grep -rEn "\.(only|skip)\(" src goal` prints nothing; (5) `git diff --stat 4e75763 -- goal/ src/trips/application/ src/shared/ tsconfig.json package.json CLAUDE.md docs/` prints nothing and `git status --porcelain -- goal/ src/` prints nothing; (6) `git log --format=%s 4e75763..HEAD` has a line starting with `feat(trips): T2`. Or stop after 15 turns.
```

Запуск: `claude -p "<умова>" --model sonnet --permission-mode dontAsk --max-budget-usd 3 --output-format stream-json --verbose` + allowlist (vitest, tsc, grep, git status/diff/log/add/commit). `--max-budget-usd 3` — тверда межа окремо від мʼякого `or stop after 15 turns`.

## Метрики прогону (`runs/2026-09-29-goal-stream.jsonl`)

| | |
|---|---|
| Ходів `/goal` (оцінок) | 1 — `goal_status met: true` після першого ж ходу |
| API-ходів усередині | 47 |
| Тривалість | 189 с |
| Вартість | $1.03 (sonnet $0.99 + оцінювач haiku $0.04) |
| Токени | ~2.1M cache read, ~102k cache write, 16k output (з них 9k thinking) |
| Відмови дозволів | 14 — усі на складених командах `…; echo "exit: $?"` |
| Ручні втручання | 0 |
| Результат | коміт `eb2d3ce`, 4 файли, +126; повний vitest 53/53 |

## Де оцінювач судив транскрипт, а не стан

`dontAsk` відхилив кожну спробу надрукувати код завершення (`npx tsc --noEmit; echo "exit: $?"` — складена команда не матчиться з allowlist). У транскрипті лишилось `(Bash completed with no output)`, і оцінювач зарахував пункт (2) як «ran with no error output (clean compile)», хоча умова вимагала показати exit code. Тут це збіглося з реальністю (я перегнав `tsc` сам — exit 0), але вердикт тримався на висновку «тиша = успіх», а не на показаному коді.

## Рев'ю як diff (`git diff 4e75763..HEAD`)

Межі дотримані: змінено лише `src/trips/domain/{Trip.ts,Trip.test.ts,errors.ts}` і `src/trips/testing/aTrip.ts`. Розбіжності з підсумком агента:

1. Підсумок: «fixes base currency on first set». Diff: `budget`, `baseCurrency`, `budgetSetAt` — публічні мутабельні поля; `trip.baseCurrency = 'UAH'` обходить `BudgetCurrencyMismatchError`, і саме так це робить фабрика `aTrip`. Інваріант тримається лише на дисципліні викликів.
2. Підсумок: «rejects non-positive amounts». Diff: нуль відкидається голим `Error`, а не типізованою доменною помилкою — за sad §8 порушення правила даних мапиться в 422, а голий `Error` у T10 стане 500.
3. `aTrip({ budget })` ставить `budgetSetAt = new Date()` — фікстура не детермінована, хоча data-model §Test fixtures просить детермінованих значень.

Зонд ці місця не ловив — його я писав до прогону, і він перевіряє поведінку через `setBudget()`, а не інкапсуляцію. Пункти 1–2 — вхід для T4/T10, T2 переведено в `review`, не в `done`.
