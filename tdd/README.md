# Урок 7.7 · TDD як дисципліна виконання — звіт

Дві story з [multi-currency-summary](../docs/features/multi-currency-summary/tasks/tracker.md), кожна двічі від тієї самої бази:

- **TRP-1** — `Trip.setBaseCurrency` + `BaseCurrencyLockedError` + `RatedExpensesPort` (domain, 5 AC).
- **TRP-2** — use case `SetTripBaseCurrency` + `CreateTrip(baseCurrency?)` (application, 4 AC).

| Прогін | Гілка | Як |
|---|---|---|
| 3 агенти | `lesson-7.7-tdd` | `/tdd TRP-1`, потім `/tdd TRP-2 --review-tests` → мій перегляд → `/tdd TRP-2` |
| Одна сесія | `lesson-7.7-single` | один промпт «реалізуй TRP-1, потім TRP-2 за TDD, повний цикл», `--disallowedTools Agent Skill` |

Однакові умови: `claude -p --model sonnet --permission-mode dontAsk --setting-sources project,local`, той самий allowlist, база `c8a2d32` + фікс хука, той самий `CLAUDE.md` з розділом «TDD-контракт».

## Обв'язка

- `.claude/agents/tdd-test-writer.md`, `tdd-implementer.md`, `tdd-refactorer.md` — адаптація демо під TS/vitest: тести колоковані (`src/**/*.test.ts`, `src/**/testing/**`), RED дозволяє заглушки API з `throw new Error('not implemented')`, щоб tsc був зелений, а падіння — на поведінці; refactorer має право на чесний no-op.
- `.claude/skills/tdd/SKILL.md` — координатор, `--review-tests`, resume з GREEN, якщо HEAD = `test(<ID>)`.
- `scripts/tdd-gate.mjs` — гейти однією командою з exit code: тема коміту, tsc, vitest (JSON-репортер), падіння лише у тестах RED-коміту, `git diff <RED> HEAD -- <тестовий контракт>` порожній.
- `scripts/hooks/commit-msg` (був `pre-commit` з 7.6) — хук знає тему коміту: `test(<ID>)` мусить бути червоним, `feat|refactor(<ID>)` — зелений, без тестів у staged і з `test(<ID>)` в історії. Інакше RED-коміт неможливий: гейт 7.6 вимагав зеленого vitest на кожному коміті.

## Цифри

| | /tdd TRP-1 | /tdd TRP-2 | одна сесія TRP-1 | одна сесія TRP-2 |
|---|---|---|---|---|
| Час агента | 209 с | 73 + 109 = 182 с (+ ~90 с мого перегляду) | ~83 с | ~57 с |
| Вартість | $0.42 | $0.24 + $0.29 = $0.53 | $0.58 на обидві, ~180 с разом зі звітом | |
| Прогонів vitest до зеленого (GREEN) | 1 | 1 | 1 | 1 |
| Рядків тестів / реалізації | 34 / 20 (1.70) | 131 / 28 (4.68), з них мої +37 | 34 / 22 (1.55) | 86 / 29 (2.97) |
| Спроб змінити тест після RED | 0 | 0 | 0 | 0 |
| Зупинок на точці контролю | 1 хибна (баг хука) | 0 | 0 | 0 |
| Refactor | no-op | no-op | не робився | не робився |

Разом: 3 агенти — ~391 с і $0.95 (+ $0.27 на перший прогін, що впав на правах); одна сесія — 180 с і $0.58. Ізоляція коштувала ×2.2 часу і ×1.6 грошей.

## Що зламалось і що зловили

1. **Перший `/tdd TRP-1` упав на `dontAsk`**: test-writer писав файл через heredoc, координатор склеїв гейт з `; echo "exit=$?"`. Правило «одна Bash-команда, файли лише Write/Edit» пішло в `CLAUDE.md` і SKILL (`c8a2d32`), тож і одна сесія отримала його.
2. **Перша одна сесія сама викликала `/tdd`** — skill лежав у worktree. Зупинив, але вкладений `claude` пережив `TaskStop` батьківського bash: його test-writer дописав RED у worktree вже після моєї перевірки `git status`. Друга «одна сесія» знайшла ці файли і закомітила як свої (numstat RED-комітів побайтно збігся з /tdd). Прогін викинуто (тег `single-run-1-contaminated`), повтор — з чистої бази і з `--disallowedTools Agent Skill`.
3. **Хибна відмова хука на GREEN TRP-1** — `git log | grep -q` під `pipefail`: grep закриває пайп, git log отримує SIGPIPE (141). Знайшов tdd-implementer, повторив коміт і описав причину у звіті. Фікс — `a312099`.
4. **`stats` після resume показав «тести +0»** — BASELINE pre-flight при resume = RED-коміт. Помітив координатор, фікс — `1be84f8`.
5. **`--review-tests` на TRP-2 зловив діру в оракулі.** Test-writer написав рівно AC-t2-1/2/4. Жоден тест не має «валюта задана, порт → false, зміну дозволено». Мутант `setBaseCurrency(currency, trip.baseCurrency !== undefined)`, що взагалі не питає порт, проходить 3/3. Я додав два тести з Checklist Step 1 і Edge cases (порт спитано з tripId; та сама валюта — без порту), мутант упав 1/5, RED переписано amend-ом до запуску implementer-а (`f3e824e`).
   Одна сесія написала ті самі три тести з тією самою дірою. Її код правильний, бо писав його той самий контекст, що читав правило в story, але той самий мутант проходить її тести 3/3. Правило живе в коді, а не в специфікації.
6. **Обидва варіанти пропустили Step 4 TRP-1** (`setBudget` через `setBaseCurrency` — «одна точка правила»): на нього немає AC, отже немає тесту, отже немає роботи. Обидва чесно про це написали.
