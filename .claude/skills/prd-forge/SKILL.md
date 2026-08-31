---
name: prd-forge
description: >
  Мій форк PRD-скіла (sdlc:write-prd) під власну практику: словник один на
  репо (кореневий CONTEXT.md з Glossary + Invariants — hard input, per-feature
  копія опційна), coverage-типи AC переозначені під single-user домен
  (authorization → lifecycle: межа доступу — статус поїздки, не роль),
  error-конвенція — типізовані Error-класи з мапінгом у presentation
  (не snake_case module.error_name), NFR-таблиця з передзаповненими target
  під локальний Node+Express+Postgres, додаткова секція §9 Migration impact
  (кожне нове поле = SQL-файл у migrations/). Тригери: «prd-forge <slug>»,
  «PRD для <slug>», «/prd-forge <slug>». Пише docs/features/<slug>/PRD.md
  за власним шаблоном (8 секцій + §9). Standalone: не залежить від
  SDLC-плагіна курсу.
---

# Skill: prd-forge — PRD-драфтер під мою практику

Той самий каркас, що у `sdlc:write-prd` (prereq check → read → channels → draft → Socratic loop → критик з чистим контекстом → write + commit), але контракти секцій, coverage-типи AC і дефолти NFR переписані під те, як реально влаштовані мої проєкти: pet-інструменти з одним користувачем і робочий travel-B2B з живим легасі, стек TypeScript/Express/Postgres, Clean Architecture з typed domain errors.

## Відмінності від готового write-prd (навіщо форк)

1. **Словник один на репо** — hard required input: кореневий `CONTEXT.md` (`## Glossary` + `## Invariants`); `docs/features/<slug>/CONTEXT.md` читається додатково, якщо існує. Готовий скіл вимагає per-feature копію — у моєму репо це плодило б дублікати словника.
2. **Lifecycle замість authorization** — п'ятірка обов'язкових coverage-типів AC: happy / validation / **lifecycle** (переходи state-машини: planned/active/finished і їхні заборони) / domain invariant / cross-context. Authorization-тип обов'язковий лише якщо фіча декларує access boundary (шаринг, ролі); для single-user фіч це чесніше, ніж вигадувати RBAC.
3. **Error-конвенція мого стека** — reference-скан шукає типізовані доменні Error-класи (`TripNotFoundError`, `TripNotAcceptingExpensesError`) і їх мапінг у presentation: відсутність → 404, відмова state-машини → 409, валідація на межі (zod) → 422. У §5 AC цих токенів усе одно немає (WHAT-only), але критик знає, у що AC зобов'язаний змапитись на стадії API.
4. **NFR-дефолти під стек** — таблиця приходить передзаповненою: p95 read ≤ 250 ms, p95 write ≤ 150 ms, ≥ 30 req/s (k6 smoke у CI), гроші тільки в minor units (integer `Money`). Замість «придумай target» — «підтверди або зміни дефолт».
5. **+§9 Migration impact** — у моїх репо будь-яке нове поле означає SQL-файл у `migrations/`; PRD зобов'язаний назвати дельту даних (нове поле / нова сутність / нічого) ще до стадії data model, бо це головний драйвер оцінки.
6. **Критик читає Invariants** — sub-agent критика отримує `## Invariants` з кореневого CONTEXT.md і перевіряє кожен AC на конфлікт з ними (наприклад «budget ніколи не блокує» проти AC, який щось забороняє через budget).
7. **AC → назва тесту** — контракт §5: кожен AC формулюється так, щоб з нього напряму читалась описова назва vitest-теста («blocks adding expense to finished trip»), не Go-style TestPascalCase з курсового прикладу.

## Owner

Автор фічі (зазвичай я). На робочих фічах — плюс власник модуля-легасі-двійника.

## When to use

- «prd-forge <slug>», «PRD для <slug>», після Confirmed idea-brief.
- Skip, якщо `docs/features/<slug>/PRD.md` існує зі status: Approved — пропонуй edit, не regenerate.

## Inputs

**Hard required** (skill зупиняється без них):

- `<slug>` — kebab-case slug фічі.
- `docs/features/<slug>/idea-brief.md` зі `status: Confirmed` — §2 Problem, §5 Out of scope, §11 RICE, §13 Recommendation.
- кореневий `CONTEXT.md` — `## Glossary` (канонічні терміни й актори) + `## Invariants`.

**Optional:** `--reference <path>` — сусідній модуль `src/<bc>/` як джерело патернів; `docs/features/<slug>/CONTEXT.md` — per-feature уточнення словника.

## Protocol (7 кроків, як у оригіналі)

1. **Prereq check (hard refuse).** Без Confirmed idea-brief → «спершу /discovery <slug>»; без кореневого CONTEXT.md → «спершу глосарій». Без мовчазних фолбеків.
2. **Read required.** Кореневий Glossary + Invariants (канон, перемагає все); per-feature CONTEXT.md якщо є; idea-brief §2/§5/§11/§13.
3. **Ask channels (AskUserQuestion, multi-select).** Reference module з `src/` / документація репо (SPEC.md, ARCHITECTURE.md, adr/) / Skip. Без broad scans — тільки названі шляхи.
4. **Read selected.** З reference-модуля: Error-класи, статуси state-машини, zod-схеми на межі, формат агрегатів.
5. **Read own template.** `./templates/PRD-template.md` — inline `<!-- prd-forge: ... -->` коментарі є контрактом генерації кожної секції.
6. **Propose draft.** §1–§9 разом; §5 — стільки AC, щоб кожна US мала ≥1 і всі 5 типів (happy/validation/lifecycle/invariant/cross-context) були представлені.
7. **Socratic loop → критик → write + commit.** Per-item Approve / Edit / Drop / Save as Open Question (+ Add edge case для AC); edits-log ведеться; Drop, що зламав coverage-тип, → regen заміни того ж типу. Потім sub-agent критик з чистим контекстом (draft + edits-log + Glossary + **Invariants**): вердикт APPROVE / REVISE з блокерами; кожен finding — Accept / Override (Override лишає bullet у §1 ¶4). Пре-write regex-скан §5 на заборонені токени (HTTP-дієслова, шляхи, статус-коди, error-strings, JSON, SQL). Записати `docs/features/<slug>/PRD.md`, запропонувати (не виконувати) коміт `02: PRD for <slug> via prd-forge`. `status: Approved` НЕ проставляється скілом — це людський gate.

## Self-check

- Актори §4 — дослівно з Glossary (для pet-фіч це `owner`, не «user»).
- §5: ≥1 AC кожного з 5 типів ПІСЛЯ всіх Drop; 0 заборонених токенів (regex як у оригіналі).
- Кожен AC читається як майбутня назва vitest-теста.
- §6: усі target числові; дефолти або підтверджені, або свідомо змінені (у edits-log).
- Жоден AC не суперечить `## Invariants` кореневого CONTEXT.md (перевіряє й критик).
- §8: кожне питання має owner + due.
- §9: дельта даних названа явно, навіть якщо це «нічого нового».

## Anti-patterns (успадковані + свої)

- RBAC-ролі, вигадані для single-user фічі, аби формально закрити authorization-тип.
- AC, що дублює інваріант словника як заборону там, де інваріант каже «сигнал, не заборона».
- NFR-таблиця з дефолтами, «підтвердженими» не читаючи (edits-log без жодного рядка по §6 — привід перепитати).
- §9 «TBD» — дельта даних або є, або її немає; «подумаємо потім» ламає оцінку.
- Технічні токени у §5: їм місце у стадіях API/ADR, PRD — WHAT-only.

## Template

→ [./templates/PRD-template.md](./templates/PRD-template.md)
