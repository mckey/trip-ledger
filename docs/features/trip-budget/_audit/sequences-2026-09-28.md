# Sequence coverage audit — trip-budget (2026-09-28)

Skill: `complete-sequence-diagrams` (sdlc plugin v4.5.1). Size: S (з frontmatter PRD/SAD; `.size` немає).
Джерела: PRD §4 (6 user stories), PRD §5 (11 AC), `sad.md` §6 (3 flows на вході). Інтервʼю-глибина: medium (дефолт, `.claude/sdlc.local.md` немає).

## Класифікація sync / async

Ключові слова async (webhook, cron, biweekly, scheduled, external, queue) у PRD не зустрічаються → **усі flows sync**; idempotency-key / retry budget / DLQ-гілка не додаються.

## Use-case pass (PRD §4)

| User story | Status | Де показано |
|---|---|---|
| US-01 Задати бюджет | Covered | flow 1 (happy path) |
| US-02 Залишок у підсумку | Covered | flow 3 |
| US-03 Перевищення одразу | Covered | flow 2 (`BudgetBlock` у відповіді на додавання) |
| US-04 Неврахованi витрати | Covered | flow 2, flow 3 (лічильник uncounted) |
| US-05 Замінити бюджет | Covered | flow 1 («замінити значення, без журналу») |
| US-06 Ретроспектива finished | Covered | flow 1, гілка «будь-який статус, включно finished» |

## AC pass (PRD §5)

| AC | Status | Де показано |
|---|---|---|
| AC-01 happy path задання | Covered | flow 1 |
| AC-02 валідація суми / валюти | Covered | flow 1, `alt форма невалідна` + `alt base currency вже зафіксована й валюта інша` |
| AC-03 remaining = budget − Σ counted | Covered | flow 3 |
| AC-03b від'ємний remaining | Trivial | flow 3, фінальне повідомлення — окремого runtime-шляху немає, лише знак числа |
| AC-04 budget не блокує | Covered | flow 2, «зберегти витрату (завжди)» до читання budget |
| AC-05 cross-context, без мутації витрат | Covered | flow 1 не пише в `expenses`; flow 3 рахує `BudgetBlock` на читанні |
| AC-06 лічильник uncounted | Covered | flow 2, flow 3 |
| AC-06b усі витрати чужовалютні | Trivial | flow 3, `Note over E` — той самий шлях, інші числа |
| AC-07 заміна без історії | Covered | flow 1 |
| AC-08 authorization | **Missing → drawn** | новий `### Cross-cutting: межа доступу до budget і підсумку (AC-08)` |
| AC-09 finished не заважає | Covered | flow 1, гілка «поїздка є (будь-який статус)» |

Разом: 6/6 US, 11/11 AC (8 Covered, 2 Trivial, 1 Missing → дописано).

## Рішення по Missing

AC-08 скіл пропонує двома способами: як non-runtime N/A («перевірка в middleware») або як окремий flow. Обрано **process** — окремий cross-cutting flow: у ньому є runtime-властивість, яку N/A-рядок не передає — ключ звіряється **до** звернення до сховища, інакше різниця відповідей «немає доступу» / «немає поїздки» розкриває існування поїздки (вимога AC-08 і SAD §8).

## Edits-log

- `sad.md` §6: + коментар-вказівник на цей аудит; + блок `### Cross-cutting: …(AC-08)` (generic-учасники `<client>` / `<service>` / `<data-store>`); + секція **Flagged** (legacy-учасники flows 1–3, persist-кроки для data-model, sync-класифікація).
- Flows 1–3 змістовно не змінені (additive only), але **backstop-валідація кроку 8 впала на всіх трьох**: `;` у тексті повідомлень (рядки 200, 242, 267, 271) Mermaid читає як роздільник інструкцій — з уроку 6.4 ці діаграми на GitHub рендерились червоною помилкою. Виправлено лише синтаксис: `;` → `—` / дужки, без зміни змісту.
- Mermaid-перевірка: `mermaid@11` `parse()` — до виправлення 3/6 FAIL, після — 6/6 блоків `sad.md` OK (2 C4 + 4 sequence).
- Той самий дефект (9 рядків з `;`) є в `docs/features/multi-currency-summary/sad.md` — поза scope цього прогону, передано на прогін data-model для multi-currency-summary.
