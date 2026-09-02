---
name: arch-forge
description: >
  Мій форк архітектурного скіла (sdlc:architecture-design) під власну практику:
  SAD за arc42 (12 секцій) + ADR у MADR + C4 L1/L2 для фіч у моїх репо —
  TypeScript/Express/Postgres, Clean Architecture з двома-трьома bounded
  context-ами і портами між ними; single-user pet-інструменти та робочий
  travel-B2B з живим легасі. Відмінності: словник один на репо (кореневий
  CONTEXT.md, Invariants — hard input і для драфту, і для критика), 4-й критерій
  радіусу впливу «зачіпає базу» (нова колонка/таблиця = SQL-файл у migrations/),
  ADR-naming NNNN-<bc>-<рішення>, §5 з передзаповненим списком контейнерів мого
  стека і дельтою файлів (+/~), §6 з «тестовим слідом» (flow → назва
  vitest-теста), §7 за замовчуванням N/A для фіч в одному процесі, розмірна
  каденція питань (XS/S — 3 батчі замість 12 секцій). Тригери: «arch-forge
  <slug>», «SAD для <slug>», «архітектура для <slug>», «/arch-forge <slug>».
  Пише docs/features/<slug>/sad.md + docs/features/<slug>/adr/NNNN-<bc>-*.md.
  Standalone: не залежить від SDLC-плагіна курсу.
---

# Skill: arch-forge — SAD + ADR під мою практику

Той самий каркас, що у `sdlc:architecture-design` (prereq check → read → Explore → bootstrap → чорновик у пам'яті → Socratic walk з ADR-gate → критик з чистим контекстом → фінальний коміт), але item-bank-и, шаблони, критерії радіусу впливу і каденція питань переписані під те, як реально влаштовані мої проєкти: один процес Node + PostgreSQL, Clean Architecture з портами між BC, гроші тільки в minor units, кожне нове поле — SQL-міграція, тести vitest/supertest поверх in-memory репозиторіїв.

## Відмінності від готового architecture-design (навіщо форк)

1. **Словник один на репо.** Hard input — кореневий `CONTEXT.md` (`## Glossary` + `## Invariants`); `docs/features/<slug>/CONTEXT.md` читається додатково. Invariants — не довідка, а фільтр: кожне рішення §4–§8 перевіряється на конфлікт з ними ще у чорновику, і критик отримує їх окремим входом (як у моєму prd-forge).
2. **Чотири критерії радіусу впливу замість трьох.** До «≥ 3 днів переробки / ≥ 2 модулі / чесна альтернатива» додано **«зачіпає базу»** — рішення породжує колонку, таблицю, CHECK або backfill у `migrations/`. Схема у моїх репо — найдорожча річ для передумування, тому 2 з 4 → ADR, а «зачіпає базу» + чесна альтернатива → ADR завжди. Деталі → [./references/blast-radius.md](./references/blast-radius.md).
3. **ADR-naming `NNNN-<bc>-<рішення>.md`.** Префікс bounded context-у (`trips`, `expenses`, `shared`, `http`, `cross` для рішень через кілька BC) — щоб `ls adr/` читався як зміст по контекстах, а не лише хронологічно. Заголовок лишається decision-form.
4. **§5 передзаповнена під мій стек.** Контейнери відомі наперед: `HTTP presentation` (Express + zod), по одному контейнеру на BC, `shared`, `PostgreSQL`. Скіл малює C4Container сам і питає лише про **зміни**: новий BC? новий порт між BC? зворотний порт (red flag → ADR)? Обов'язкові підблоки — «Дельта файлів» (`+` новий / `~` змінюється) і «Дельта міграцій» (номер наступного SQL-файлу).
5. **§6 з тестовим слідом.** Кожен sequence-flow завершується рядком «Тестовий слід»: назви vitest-тестів (`it('…')`), які доведуть цей flow — продовження конвенції «AC → назва теста» з prd-forge. Учасники = контейнери з §5, повідомлення семантичні, без HTTP-дієслів.
6. **§7 N/A за замовчуванням.** Для фіч, що живуть у тому самому процесі й не додають воркерів/черг/сховищ, скіл сам ставить фіксований N/A-текст і питає лише «фіча додає новий процес?». Так само §8 приходить передзаповненою рядками мого стека (error mapping 404/409/422, zod на межі, Money/Balance, `randomUUID()`, API-key boundary, порти між BC, expand-only міграції) — «підтверди або зміни дефолт», а не «придумай».
7. **Розмірна каденція.** XS/S: три батчі питань — A (§1–§3), B (§4–§5 з ADR-gate), C (§6–§12) — і три інкрементальні коміти замість дванадцяти; M+: по секції, як у готовому скілі. Бюджет: ≤ 8 питань для XS/S, 8–20 для M+.
8. **Explore-бриф з моїм чеклістом.** Крім мови/шарів/таблиць скіл питає subagent про **змонтовані маршрути vs наявні use case-и** (класична дірка: use case є, роут не підключений), точні версії з lockfile, in-memory дублікати репозиторіїв і тестові конвенції.
9. **Коміти у сквозній нумерації артефактів:** `03: bootstrap SAD for <slug> (arch-forge)` → `03: sad §A–§B for <slug> — …` → `03: SAD + ADR for <slug> via arch-forge` (після критика). Той самий ряд, що `01: idea …` і `02: PRD …`.

## Owner

Автор фічі (зазвичай я) у ролі архітектора. На робочих фічах — плюс власник модуля-легасі-двійника як reviewer ADR.

## When to use

- «arch-forge <slug>», «SAD для <slug>», «архітектура для <slug>» — після PRD зі `status: Approved`.
- Skip, якщо `docs/features/<slug>/sad.md` існує з 12 заповненими секціями (контент або `<!-- N/A: … -->`) і `adr/` непорожня — пропонуй review, не regenerate.
- Для одиночного ADR поза прогоном (рішення вже ухвалене в коді чи в чаті) — не цей скіл; заведи файл руками за `./templates/adr-template.md` і додай рядок у §9.

## Inputs

**Hard required** (скіл зупиняється без них):

- `<slug>` — kebab-case slug фічі.
- `docs/features/<slug>/PRD.md` зі `status: Approved` — §2 Goals, §3 Non-goals, §5 AC, §6 NFR (числа), §6.1, §8 Open questions, §9 Migration impact (якщо PRD з prd-forge).
- кореневий `CONTEXT.md` — `## Glossary` + `## Invariants`.
- git-репозиторій (brownfield-скан і інкрементальні коміти).

**Optional:** `docs/features/<slug>/CONTEXT.md`; `docs/features/<slug>/idea-brief.md` §14 (відкинуті підходи — джерело чесних альтернатив для ADR); сусідні `docs/features/*/sad.md` і `adr/` — сусідні ADR через межу фіч лінкуються так само, як усередині фічі.

## Protocol (8 кроків, як у оригіналі)

1. **Prereq check (hard refuse).** `test -f docs/features/<slug>/PRD.md` і `status: Approved` у frontmatter; кореневий `CONTEXT.md` з `## Invariants`. Розмір — з `feature_size` PRD (файл `.size` не веду). Без мовчазних фолбеків.
2. **Read required.** Кореневі Glossary + Invariants (канон, перемагає все) → per-feature CONTEXT → PRD (§2, §3, §5, §6, §6.1, §8, §9) → §14 idea-brief → сусідні SAD/ADR, якщо PRD на них посилається.
3. **Brownfield scan.** Один `Agent` (`subagent_type: Explore`, < 400 слів) з моїм брифом: (a) мова/фреймворки з точними версіями **з lockfile**; (b) BC і шари; (c) порти між BC та їх адаптери; (d) таблиці з `migrations/` з колонками і CHECK-ами, in-memory дублікати; (e) стиль взаємодії між BC; (f) обмеження для `<slug>`: наявні колонки/ендпойнти/форми відповідей, **use case-и без змонтованих роутів**, value objects і їх інваріанти, error → HTTP мапінг, тестові конвенції. Greenfield → `<!-- brownfield: N/A -->` у §3.
4. **Bootstrap.** `./templates/sad-template.md` → `docs/features/<slug>/sad.md`; frontmatter (owner, updated_at, feature_size з PRD, ticket). Коміт `03: bootstrap SAD for <slug> (arch-forge)`. Єдиний запис на диск до кроку 7.
5. **Read own templates.** `./templates/sad-template.md` — inline `<!-- arch-forge: … -->` коментарі є контрактом кожної секції; `./templates/adr-template.md` — MADR + блок «Радіус впливу 4/4».
6. **Чорновик у пам'яті §1 → §12** за item-bank-ами мого стека (нижче) з пре-Socratic гігієною: актори дослівно з Glossary; версії з Explore; числа §10 дослівно з PRD §6; учасники §6 = контейнери §5; жодне рішення §4–§8 не суперечить Invariants; §11 містить ≥ 1 brownfield-gotcha з Explore і **перший ризик — продуктовий**.
7. **Socratic walk з ADR-gate, батчами за розміром.** Для кожного батча: показати секції цілком + нумерований список рішень → по одному `AskUserQuestion` на рішення з 4 діями (Прийняти / Виправити / Винести у §11 OQ з owner+due / Викинути; рекомендована опція першою, description — що технічно станеться + trade-off + наступний крок скіла) → для кожного Прийнятого — 4 критерії радіусу впливу → ADR `adr/NNNN-<bc>-<рішення>.md` зі заповненими Links (PRD, §N SAD, сусідній ADR — включно з ADR сусідніх фіч) → запис секцій батча + ADR + коміт `03: sad §A–§B for <slug> — <суть>`. Edits-log ведеться (edit / drop / save_as_oq з дослівним before/after/причиною); до записаного батча скіл не повертається.
8. **Критик + фінал.** Один `Agent` (`general-purpose`, чистий контекст): фінальний sad.md + edits-log + ADR-spawns log + шляхи до PRD / кореневого CONTEXT (**з Invariants**) / `adr/` / CLAUDE.md. Класи F1–F6 як в оригіналі плюс **F7 — конфлікт з Invariants** (рішення забороняє те, що словник називає сигналом, або мутує те, що словник називає незмінним). Кожен finding — Accept / Accept з іншим формулюванням / Override з rationale (Override → bullet у §1 ¶4). Пре-write regex: Mermaid (парні фенси, оголошені елементи, без `<placeholder>`), імена ADR `^\d{4}-(trips|expenses|shared|http|cross)-[a-z0-9-]+\.md$` зі `Status: Accepted`, §9 без сиріт, кожен flow §6 має «Тестовий слід». Фінальний коміт `03: SAD + ADR for <slug> via arch-forge`. `status: Approved` у sad.md НЕ проставляється скілом — це людський gate.

## Item-bank-и мого стека (для кроку 6)

- **Де живе нове поле** (§4): атрибут наявної сутності/таблиці · окрема 1:1-таблиця · новий BC. Дефолт — атрибут, якщо у поля немає власного життєвого циклу.
- **Як BC дістає чуже** (§4/§5): наявний порт · новий порт у `domain/` споживача + адаптер в `infrastructure/` · **зворотний порт** (новий напрямок залежності — завжди ADR) · композиція у presentation (анти-патерн, згадувати тільки як відкинуту опцію).
- **Форма відповіді** (§5): розширити наявний об'єкт · envelope навколо наявного тіла (breaking change → §11) · новий ендпойнт.
- **Тип грошей** (§5/§8): `Money` (невід'ємні minor units) · `Balance` (знакові minor units) · scaled integer для коефіцієнтів (курс × 10^6) — плаваюча точка заборонена.
- **Вид міграції** (§5/§8): expand-only nullable · expand + backfill одним файлом · contract (видалення/перейменування — окрема стадія).
- **Де перевіряти правило** (§8): конструктор/метод сутності · use case · CHECK у БД як друга лінія · zod лише для форми запиту.

## Self-check

- Актори §1/§3 і терміни §12 — дослівно з кореневого Glossary; технічні терміни позначені.
- Жодне рішення §4–§8 не суперечить `## Invariants`; якщо суперечить свідомо — Override-bullet у §1 ¶4.
- §3 C4Context і §5 C4Container — реальні імена, без заглушок; §5 має «Дельту файлів» і «Дельту міграцій».
- §6: ≥ 1 flow для XS/S (2–3 для S з кількома US), 3–5 для M+; кожен flow має «Тестовий слід»; учасники = контейнери §5.
- §7 — N/A з фіксованим текстом або реальна топологія, узгоджена з §5.
- ADR: `NNNN-<bc>-<рішення>.md`, Status Accepted, ≥ 2 чесні опції без страшменів, Links на PRD + §N SAD + сусідній ADR; §9 = дзеркало `adr/` з колонкою BC.
- Кількість ADR: XS/S 2–4, M 5–12 — інакше перегляд через 4 критерії.
- §10: усі числа дослівно з PRD §6 NFR; How verify = назва vitest/supertest-теста або k6-команда.
- §11: перший ризик продуктовий; ≥ 1 brownfield-gotcha; кожен save_as_oq має owner **і** due.
- Коміти: bootstrap → батчі → `03: SAD + ADR for <slug> via arch-forge`.

## Anti-patterns (успадковані + свої)

- ADR на кожне рішення або жодного ADR — 4 критерії існують саме для фільтра.
- Зворотний порт між BC «бо так простіше» без ADR — це зміна напрямку залежностей усього репо.
- Послабити `Money` (дозволити від'ємні) замість окремого типу для різниць — інваріант сум зникає з домену.
- Тиха зміна форми відповіді (масив → об'єкт, envelope) без рядка у §11 і без згадки «контракт — стадія API».
- Flow у §6 без тестового сліду — діаграма, яку ніхто не перевірить.
- §10 з числами, яких немає у PRD §6, або з «швидко»/«надійно» без числа.
- Технічні терміни у §12 без позначки — через рік їх приймуть за доменні.
- Один гігантський коміт наприкінці — губиться трасування «яке рішення коли з'явилось».

## Templates

- [./templates/sad-template.md](./templates/sad-template.md) — 12 секцій arc42 з моїми контрактами, передзаповненими §5/§7/§8 і блоками «Дельта файлів», «Дельта міграцій», «Тестовий слід».
- [./templates/adr-template.md](./templates/adr-template.md) — MADR з frontmatter, блоком «Радіус впливу 4/4» і трьома обов'язковими Links.

## References

- [./references/blast-radius.md](./references/blast-radius.md) — 4 критерії радіусу впливу з прикладами з мого стека і правилом 2 з 4.
- [./references/c4-mermaid-syntax.md](./references/c4-mermaid-syntax.md) — C4Context / C4Container / sequenceDiagram: синтаксис + робочі приклади з trip-ledger.
