---
name: task-forge
description: >
  Мій форк sdlc:break-tasks: нарізка спроєктованої фічі на story-файли ≤ 1 дня
  під мою практику — протокол з трьох stage (slicing proposal з Accept / Edit
  waves / Reject → per-story генерація з 13 механічними гейтами → _epic +
  tracker + _generation + tasks.json), хвилі, context budget ≤ 5000 токенів,
  префікси story з bounded context, міжепічні блокери, CONTEXT.md фічі з п'ятьма
  секціями як Stage 0. Тригери: «task-forge <slug>», «нарізати задачі для
  <slug>», «tasks для <slug>», «/task-forge <slug> [--regen <ID>] [--check]».
  Пише docs/features/<slug>/CONTEXT.md і docs/features/<slug>/tasks/. Standalone.
---

# Skill: task-forge — одиниця роботи для агента під мою практику

Той самий stage 13, що `sdlc:break-tasks` (prereq → читання upstream → шари → атомарність → граф → DoD → оцінка/owner → tasks.json → self-check → коміт), але як протокол, який можна **перевірити скриптом**, а не на слово: кожна story проходить `scripts/check-tasks.mjs` до запису, провал лишає слід у `_generation.md`. Робоче середовище — мої репо: Node 22 + Express 5 + zod, Clean Architecture з чотирма шарами в кожному BC, BC говорять лише через порти, один розробник + сесії агента як виконавці, GitHub як канонічне місце, де артефакти читають (і куратор, і я з телефона).

## Відмінності від готового break-tasks (навіщо форк)

1. **Три stage з точкою зупинки, а не суцільна генерація.** Stage 1 — наратив «бачу N operationId, M flows у §6, K AC → пропоную X stories у Y хвилях» і AskUserQuestion: **Accept / Edit waves / Reject**. Готовий скіл одразу пише файли — і я погоджуюсь з нарізкою, бо вона вже лежить на диску. Без Accept (або явно позначеного `self-answered`, див. крок 5) жодного story-файлу.
2. **Хвилі й паспорт story.** Frontmatter у три групи: ідентифікація (`id`, `epic`, `project`, `bc`, `layer`), оркестрація (`wave`, `blocks`, `blocked_by`, `external_blocked_by`), сигнали (`priority`, `estimate`, `status`, `owner`, `context_budget`) + трасування (`prd_refs`, `sad_refs`, `data_refs`, `openapi_ops`, `adr_refs`, `files`). Готовий скіл має лише `deps` і плаский список T1..Tn: «скільки сесій паралельно» з нього не видно. Тіло story — GWT, atomic checklist, таблиця edge cases, DoD, «Notes» для причини `blocked`; у готовому — довільний «What» і DoD.
3. **13 гейтів механічно.** У готовому скілі гейтів немає — лише прозовий self-check (крок 12). Тут 8 структурних з лекції + 5 моїх, усі в `scripts/check-tasks.mjs`, вихід 0/1:

   | # | Гейт | Як перевіряється |
   |---|---|---|
   | G1 | ≥ 1 sequence | кожен `sad_refs` — точна мітка flow з §6 (`**Critical flow N:` або `###`-заголовок у §6) + лінк на якір §6 `../sad.md#…` |
   | G2 | ≥ 1 data delta | `data_refs` резолвиться у `data-model.md#якір` / staged міграцію, або `none: <чому>` |
   | G3 | ≥ 1 API ref | `openapi_ops` — реальні `operationId`, або `none: <чому>`; **без YAML у story** |
   | G4 | ≥ 2 AC у GWT | рядки `Given … when … then` з ID PRD §5; кожен AC у рядку ∈ `prd_refs`, `prd_refs` ∈ PRD |
   | G5 | ≥ 3 checklist steps | `- [ ] Step N` у «Checklist» |
   | G6 | context budget | оцінка (ASCII / 4 + решта / 2 — кирилиця щільніша за латиницю) ≤ 5000 і задекларований бюджет ≥ фактичного |
   | G7 | граф | `blocks` ⇔ `blocked_by` симетричні, id існують, `wave` = 1 + max(хвиля блокерів), `external_blocked_by` є в `tasks.json` іншого епіку |
   | G8 | frontmatter + форма | усі ключі й enum-и, `epic` = slug, файл = `<id>-….md`, префікс ID відповідає `bc`/`layer`, усі сім секцій непорожні, edge cases — таблиця |
   | **G9** | посилання живі | кожен відносний лінк — файл існує і GitHub-якір є серед заголовків |
   | **G10** | без копій | фенси лише `text` / `bash` / `sh` / `console`; жодного рядка ≥ 30 символів дослівно з PRD, SAD, data-model, openapi, api-sync-report, ADR, staged SQL, CONTEXT |
   | **G11** | DoD свій | ≥ 1 пункт DoD з AC цієї story або з її файлом (межі слова) — не шаблонний |
   | **G12** | межа BC | `files` лише у `src/<bc>/` (для `http` — presentation/contracts; `cross` — лише з ADR) |
   | **G13** | імена з контракту | у рядку «🔌 API» кожен `токен` цілим словом — `operationId`, схема з `components.schemas`, `Схема.поле` (поле в `properties` саме цієї схеми), код помилки або шлях, що існує; кожен код `<bc>.<snake>` у тілі є серед кодів openapi / api-sync-report |

   Плюс епічні: E1 граф ациклічний, E2 кожен PRD AC покритий, E3 кожен `operationId` покритий (порожній PRD/openapi — провал, не «0/0»), E4 `tasks.json` ⇔ frontmatter (title, layer, bc, wave, deps, external_deps, acs, files_hint), **E5 tracker sync** — Wave / Status / Blocked by / External / Estimate кожного рядка = frontmatter, E6 CONTEXT.md — 5 секцій і 8–10 термінів з NOT, E7 `_epic.md` + `_generation.md` є, **E8 file lanes** — дві story з одним файлом (директорія — префіксом) мусять бути впорядковані через `blocked_by`, інакше два виконавці паралельно правлять один роутер, **E9 epic graph sync** — список «ID ◄ блокери» в `_epic.md` дорівнює frontmatter.
   **G9 + G10 + G13 закривають дірку, якої немає у 8 гейтах лекції:** inline-копія контракту свіжа в момент написання story, тому «формат Linked artifacts» її пропускає. Тут копія не проходить, мертвий якір і зниклий із контракту `operationId` / схема / код помилки ловляться при кожному прогоні `--check` — зокрема через тиждень, коли змінили openapi. Чого скрипт не бачить: імена портів і класів з ADR (їх звіряє рев'ю — кандидат у G14).
4. **Markdown-посилання з якорями.** Лекція радить `[[wikilinks]]`, готовий скіл дає звичайні лінки без якорів (`[PRD §AC-01](../PRD.md)` відкриває файл зверху). Канонічний рівень у мене — git, читають на GitHub, де `[[…]]` — сирий текст. Тому `[sad §6 · Critical flow 1](../sad.md#6-runtime-view)`: клікається і на GitHub, і в Obsidian, веде в секцію, а G9 перевіряє якір GitHub-слагером (кирилиця лишається).
5. **ID з bounded context.** `SHR-n` shared VO · `MIG-n` staged міграція · `TRP-n` / `EXP-n` domain + application + infrastructure свого BC · `X-n` адаптер порту між BC (`bc: cross`, лише з ADR) · `HTTP-n` роутери, presenter-и, `src/presentation/app.ts` · `E2E-n` HTTP-сценарії · `DOC-n` back-port у словники / PRD / SAD / ARCHITECTURE. Той самий словник `bc`, що в ADR-naming arch-forge і кодах помилок contract-forge: з ID видно, чий це шар і хто review-ить межу. Коміт — `EXP-2: …`, PR — «EXP-2». G8 звіряє префікс з `bc`/`layer`.
6. **Хвиля — наслідок графа, а не ярлик шару.** `wave = 1 + max(wave блокерів)`, story без блокерів — W1; G7 рахує це скриптом. Шари дають лише типовий порядок (shared VO, міграції, domain → application, infra → presentation, `app.ts` → E2E), а story без залежностей від «свого» шару сама піднімається вище. Зовнішні блокери хвилю не рахують (вони в іншому трекері).
7. **Міжепічні блокери — перший клас.** У моїх фічах ланцюжок: multi-currency-summary стоїть на `Balance`, `BudgetBlock`, `TripBudgetPort` і колонках з trip-budget. `external_blocked_by: ["trip-budget:T6"]` + рядок `extern` у графі + колонка External у tracker. Готовий скіл дозволяє `deps` лише всередині файлу — міжфічний порядок живе в голові. Спільний файл двох епіків E8 не бачить — такі lanes записуються в «Notes» обох stories.
8. **Stage 0 — CONTEXT.md фічі з п'ятьма секціями.** Glossary (8–10 з NOT-межами проти кореневого `CONTEXT.md`), Invariants (з джерелом, без деталей реалізації), **Sentinel errors** (клас → `code` → HTTP → BC, з `api-sync-report.md` «Error codes»), **Scope-filter invariant** (аналог org-filter у single-user: API key до будь-якого читання, кожне читання обмежене поїздкою, чужий BC — лише через порт), Out of scope. Є файл з `/sdlc-fix-term` — доповнити відсутні секції, не переписувати.
9. **Міграції — node-pg-migrate і порядок промоції.** `files` міграційної story — staged файл(и) з `docs/features/<slug>/migrations/`; checklist — staged-roundtrip `scripts/db-roundtrip.sh` до промоції, перештампування у 17-значний utc-префікс, `node-pg-migrate up/down` на свіжій БД після. Порядок і «один деплой» — з `data-model.md` «Promotion order»: міграція, що мусить їхати разом зі story сусіднього епіку, промотується **в тій story**, а не окремою.
10. **Checklist — реальні шляхи й команди мого репо.** Кроки = файли з SAD §5 «Дельта файлів»; тест-кроки — з SAD §6 «Тестовий слід» і §10 (назви `it('…')` беруться звідти, у ті самі файли); зміна інтерфейсу — разом з усіма реалізаціями і call-sites в одній story, щоб `tsc` не був червоним між stories; гейти DoD — `node_modules/.bin/tsc --noEmit`, `npx vitest run <scope>`, `node scripts/contracts.mjs gen|lint <slug>` для HTTP-story, dependency-guard (trip-kit) мовчить.
11. **`tasks.json` лишається** — контракт готового скіла (`id, title, layer, deps, acs, dod, files_hint`) + `wave`, `bc`, `external_deps`, щоб будь-який runner курсу міг його взяти. Не руками: `--emit` генерує його з frontmatter, E4 стежить за розсинхроном.
12. **ASCII-список хвиль замість Mermaid `flowchart`.** Для DAG з fan-in малюнок стрілками нечитабельний, а `mermaid-check.md` без `mmdc` — лише структурний lint. Список «ID ◄ блокери» по хвилях (формат прикладу курсу) читається в diff-і і звіряється скриптом (E9); критичний шлях — окремим коротким ASCII.
13. **Чого з готового немає свідомо.** Експорт у трекер (Jira / Linear / YouTrack) — у pet-репо трекер = `tracker.md`. Гейт `target_surfaces` / шар `ui` — мої репо backend-only; з'явиться UI-поверхня — додати `layer: ui` і префікс. Handoff на `/sdlc-plan-tests` — тест-план живе в тестовому сліді SAD і в GWT stories; наступний крок handoff-у — перша story з Next runnable.
14. Українською; коміт у наскрізному ряду: `06: tasks for <slug> via task-forge`.

## Owner

Я як tech lead власної фічі. Виконавці — я і сесії агента; tracker пишеться для них, а не для спринт-борда.

## Inputs

**Hard required (інакше — стоп з назвою відсутнього і скілом-виробником):** `PRD.md` (§5 AC), `sad.md` (§5 дельта файлів, §6 flows з «Тестовим слідом», §9), ≥ 1 ADR у `adr/`, `contracts/openapi.yaml` (operationId), кореневий `CONTEXT.md`, `CLAUDE.md`.
**Recommended:** `data-model.md` (+ «Promotion order»), `migrations/`, `contracts/api-sync-report.md` (Error codes, Conflicts, Closed OQ), `CONTEXT.md` фічі.
**Optional:** `docs/features/*/tasks/` сусідніх фіч — `tasks.json` для `external_blocked_by` і їхні story-файли, щоб знати, хто створює спільні файли.

## Protocol

### Stage 0 — prereq + CONTEXT.md

1. Prereq check (hard) — як вище.
2. CONTEXT.md фічі за [`templates/CONTEXT.md`](./templates/CONTEXT.md): є — доповнити секції, яких бракує; нема — створити. Терміни — з PRD/SAD §12 + NOT-межа проти кореневого словника і проти слів, що вже зайняті в артефактах фічі (напр. «backfill» міграції); sentinel errors — з `api-sync-report.md`; scope-filter — з SAD §8 «Access boundary».

### Stage 1 — slicing proposal (зупинка)

3. Прочитати upstream **напряму** (не з індексу): PRD §4–§6, SAD §5/§6/§8/§10/§11, ADR, data-model, openapi, api-sync-report (зокрема Conflicts — відкриті flags стають open questions або stories), story-файли сусідніх епіків, від яких залежимо.
4. Скласти нарізку: story на шар BC із SAD §5 «Дельта файлів»; одна story ≤ 1 дня і ≤ ~500 LOC; HTTP-story — на operationId або тісну пару; E2E — на кластер AC.
5. Показати наратив: «бачу <n> operationId, <m> flows, <k> AC, <x> файлів у дельті, зовнішні блокери <…>. Пропоную <X> stories у <Y> хвилях» + таблиця хвиль і відкриті питання. **AskUserQuestion**: Accept (рекомендовано, якщо AC і ops покриті) / Edit waves / Reject. Edit — перерахувати і показати знову; Reject — стоп. Відповідь → `_generation.md` «Stage 1» дослівно, з позначкою хто відповів.
   Якщо owner делегував Socratic-питання («закривай сам рекомендованою опцією») — рядок позначається `self-answered`, stories мають статус `todo`, але handoff першим пунктом просить owner-а переглянути таблицю Stage 1; до його «ок» Next runnable у tracker іде з позначкою «пропозиція, не рішення».

### Stage 2 — per-story generation з гейтами

6. Для кожної story за [`templates/story.md`](./templates/story.md): записати чернетку → `node .claude/skills/task-forge/scripts/check-tasks.mjs <slug> --story <ID>` → червоний гейт → регенерувати **лише** проблемну секцію → повторити (≤ 3 спроби, далі — питання мені). Кожен fail + fix — рядок у «Gate log».
   Поки не зібрано всі stories, G7/G9 можуть червоніти на ще не записаних сусідах і `_epic.md` — це очікувано; остаточно вони рахуються у кроці 9.
7. Linked artifacts — лише посилання з якорем + імена (`operationId`, схеми, колонки, мітки `alt`-гілок). Жодного YAML/SQL/тексту AC.

### Stage 3 — epic, tracker, provenance, tasks.json

8. `_epic.md` ([шаблон](./templates/_epic.md)) — наратив для людини: проблема, рішення, хвилі, список «ID ◄ блокери», критичний шлях, ризики, метрики. `tracker.md` ([шаблон](./templates/tracker.md)) — плоский стан + алгоритм вибору + Next runnable. `_generation.md` ([шаблон](./templates/_generation.md)) — inputs, Stage 1, coverage AC/ops, gate log, open questions, deviations. `tasks.json` — `check-tasks.mjs <slug> --emit`.
9. Повний прогін `node .claude/skills/task-forge/scripts/check-tasks.mjs <slug>` → `ALL GATES PASSED`. Інакше — назад у крок 6 для конкретної story.
10. Self-check: кожна story ≤ 1 дня з owner; у хвилі ≥ 1 паралельна пара, де робота дозволяє; DoD у кожній story свій; немає story, що ламає Hard rule з CLAUDE.md / SAD §11; кожен відкритий flag api-sync-report — або story, або open question.
11. Коміт `06: tasks for <slug> via task-forge` + handoff-блок: що зроблено (к-сть stories/хвиль, розмір фічі, чи був Stage 1 `self-answered`), що переглянути (таблиця Stage 1, `CONTEXT.md`, `tasks/_epic.md`, одна story), наступне — перша story з Next runnable.

## `--regen <ID>` і `--check`

- `--regen <ID>` — протокол: перегенерувати одну story (змінився upstream), решту не чіпати; після — `--emit` і гейти всього епіку.
- `--check` — прапорець скрипта (те саме, що без прапорців): лише перевірка, без генерації. Регулярна перевірка cross-artifact consistency (G9/G10/G13/E4/E5) після змін у PRD / SAD / openapi.
- Невідомий прапорець або `--story` з неіснуючим ID — вихід 2, не «зелений» прогін.

## Anti-patterns

- Файли до Accept у Stage 1; `self-answered` Stage 1 без позначки в `_generation.md`.
- YAML контракту / SQL / текст AC усередині story «щоб агент не відкривав файл» — розійдеться з оригіналом за тиждень.
- `[[wikilinks]]` у репо, яке читають на GitHub.
- Зміна інтерфейсу в одній story, а реалізації — в іншій: між ними `tsc` червоний і будь-яка story «не проходить DoD».
- Story на два BC без `bc: cross` і ADR — dependency-guard її все одно зупинить.
- Міжфічна залежність «в голові» замість `external_blocked_by`.
- DoD «тести зелені, lint чистий» і нічого більше.
