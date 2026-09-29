---
name: tdd
description: Координатор повного RED → GREEN → REFACTOR циклу для story trip-ledger через 3 ізольовані агенти (tdd-test-writer, tdd-implementer, tdd-refactorer) з детермінованими гейтами між фазами. Використовуй на `/tdd <ID>` (наприклад `/tdd TRP-1`) або «прожени TDD-цикл на story X». Прапор `--review-tests` зупиняє цикл після RED для перегляду тестів людиною.
allowed-tools: Bash, Read, Edit, Agent
---

# /tdd — координатор циклу

Ти диригент. Сам не пишеш ні тестів, ні коду і не виправляєш агентів. Кожна фаза — окремий виклик `Agent` зі своїм контекстом; між фазами — одна команда гейту з exit code. Гейт впав → STOP з його повідомленням, без спроб «дотягнути».

Чому агенти, а не три кроки тут: skill виконується в тому самому контексті, що й ти. Якщо ти пишеш тести сам, а потім реалізацію — реалізація протікає в тести. Ізоляцію дає лише `Agent`.

## Вхід

- `<ID>` — обов'язково (`TRP-1`, `T10`).
- `--review-tests` — опційно: STOP після Gate 1.

## Pre-flight

`node scripts/tdd-gate.mjs preflight <ID>` — exit ≠ 0 → STOP з виводом.
Запам'ятай `BASELINE` і `RESUME_FROM`. `RESUME_FROM: GREEN` означає: останній коміт — RED цієї story (другий запуск після `--review-tests`), Phase 1 пропускаєш, але Gate 1 проганяєш.

## Phase 1 — RED

```
Agent(subagent_type="tdd-test-writer", description="RED <ID>",
  prompt="Story <ID>. Твоя фаза — RED за твоїм системним промптом: падаючі тести по одному на AC + заглушки API, tsc зелений, коміт test(<ID>): add failing tests per AC. Останній рядок — RED phase commit: <SHA>. Реалізацію не пиши.")
```

### Gate 1

`node scripts/tdd-gate.mjs red <ID>` — exit ≠ 0 → STOP: `Phase 1 gate failed: <вивід>`.

`--review-tests` → STOP з:

```
RED зафіксовано: <SHA>. Переглянь тести: git show <SHA>
Продовжити: /tdd <ID>   (pre-flight побачить RED і почне з GREEN)
Відкотити:  git reset --hard <BASELINE>
```

## Phase 2 — GREEN

```
Agent(subagent_type="tdd-implementer", description="GREEN <ID>",
  prompt="Story <ID>. Твоя фаза — GREEN: RED-коміт — HEAD, тести з нього read-only. Мінімальна реалізація до зеленого vitest, коміт feat(<ID>): implement to make tests pass. Останні рядки — GREEN phase commit: <SHA> і ITERATIONS: <n>. Тести не змінюй.")
```

Якщо агент повернув `GREEN blocked: …` — STOP з цим рядком (агент вважає тест неправильним, це рішення людини).

### Gate 2

`node scripts/tdd-gate.mjs green <ID>` — exit ≠ 0 → STOP: `Phase 2 gate failed: <вивід>`.

## Phase 3 — REFACTOR

```
Agent(subagent_type="tdd-refactorer", description="REFACTOR <ID>",
  prompt="Story <ID>. Твоя фаза — REFACTOR: GREEN-коміт — HEAD. Чисть лише його код, vitest після кожної зміни, тести строго read-only. Коміт refactor(<ID>): <що> і рядок REFACTOR phase commit: <SHA> — або REFACTOR phase: no-op — <чому>.")
```

### Gate 3

`node scripts/tdd-gate.mjs refactor <ID>` — exit ≠ 0 → STOP: `Phase 3 gate failed: <вивід>`. No-op гейт приймає (HEAD лишається feat).

## Завершення

1. `node scripts/tdd-gate.mjs stats <ID> <BASELINE>` — рядки тестів і реалізації.
2. У tracker епіку (`docs/features/<epic>/tasks/tracker.md`) статус рядка `<ID>` → `done` (Edit, лише цю клітинку), `git commit -am "docs(tracker): <ID> done"`.
3. Звіт користувачу:

```
/tdd <ID> — цикл завершено
  RED      <sha>  test(<ID>): …        <n> червоних
  GREEN    <sha>  feat(<ID>): …        ITERATIONS <n>
  REFACTOR <sha>  refactor(<ID>): …    (або no-op — причина)
  Гейти: 1 ✓  2 ✓  3 ✓   тести не змінені з RED
  Рядки: тести +<n> / реалізація +<n> (ratio <r>)
  Зауваги агентів: <неоднозначні AC, помічені баги — дослівно, якщо були>
```

## Антипатерни

- Виконати фазу самому «бо агент довго» — ламає ізоляцію, вся ідея циклу зникає.
- Пропустити гейт, бо агент написав «все зелене». Агент звітує, гейт перевіряє.
- Лагодити тест або код після STOP. Упав гейт — людина вирішує, що далі.
- Склеювати коміти. Три окремі коміти — це і є журнал циклу.
