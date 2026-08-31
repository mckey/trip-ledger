---
status: Draft
owner: "<з idea-brief frontmatter>"
reviewers: []
updated_at: "<YYYY-MM-DD>"
feature_size: <з idea-brief>
stage: "02"
ticket: "-"
---

# PRD — <slug>

<!-- prd-forge: шапка inputs. Формат:
> **Inputs (required):** [idea-brief](./idea-brief.md) · [CONTEXT](../../../CONTEXT.md)
> **Reference module:** `src/<bc>` — які патерни взято (Error-класи, статуси, межова валідація, агрегати). Якщо reference нема — «N/A — green-field».
> **Channels used:** перелік з кроку 3 або «None». -->

## 1. Context

<!-- prd-forge: 3-4 абзаци. ¶1 — проблема з idea-brief §2, цитуй сегмент §3.
¶2 — чому зараз (тригер + дедлайн сезону, якщо він у брифі є — у travel він є майже завжди).
¶3 — прийнятий вектор з §13 Recommendation, 1-2 речення.
¶4 — reference-патерни як traceability + bullets «Decision override» з фази критика.
WHAT+WHY only: без назв сховищ, бібліотек, схем. -->

## 2. Goals

<!-- prd-forge: 2-3 стратегічні outcomes, кожен — прояв §13. Числа — у §7, не тут. -->

## 3. Non-goals

<!-- prd-forge: 3-5 явних меж, кожна з причиною з idea-brief §5 Out of scope
або як наслідок Edit/Drop у Socratic loop (так і пиши: «наслідок Edit US-NN»). -->

## 4. User stories

<!-- prd-forge: ≥5 US у форматі As an <actor> / I want / So that.
Актор — ТІЛЬКИ з кореневого Glossary (для pet-фіч — owner; «user»/«admin» заборонені,
якщо їх немає у словнику). Title 3-6 слів, дія — не сутність. Кожна US ≥1 AC у §5. -->

### US-01: <title>

**As an** <actor>
**I want** <action>
**So that** <observable benefit>

## 5. Acceptance criteria

<!-- prd-forge: Given/When/Then, business-observable only.
5 обов'язкових coverage-типів (≥1 кожного):
1. happy — головний потік → система фіксує і підтверджує.
2. validation — невалідний ввід → система блокує і пояснює, яким має бути поле.
3. lifecycle — дія проти статусу state-машини (planned/active/finished) → система
   відмовляє І називає правило, АБО свідомо дозволяє (ретроспектива) — тоді AC
   фіксує дозвіл явно. Замінює authorization-тип оригіналу для single-user фіч.
4. domain invariant — дія проти named invariant з CONTEXT.md → блок з назвою правила
   людською мовою. Якщо інваріант каже «сигнал, не заборона» — AC зобов'язаний
   описати прийняття дії + сигнал, не блок.
5. cross-context — дія залежить від стану іншого bounded context → правило enforced.
(+ authorization — ЛИШЕ якщо фіча декларує access boundary.)
Кожен AC читається як описова назва vitest-теста.
Заборонені токени: HTTP-дієслова, URL-шляхи, голі статус-коди, error-strings
[a-z_]+\.[a-z_]+, JSON-фрагменти, SQL. Edge-варіанти — сабліттерами AC-NNb. -->

### AC-01 (US-01) — happy path

**Given** <передумови: актор, стан domain-об'єктів>
**When** <дія від актора>
**Then** <спостережуваний результат>

## 6. Non-functional requirements

<!-- prd-forge: дефолти передзаповнені під локальний Node+Express+Postgres —
підтверджуй або міняй свідомо (зміна → рядок у edits-log). TBD тільки з парним
питанням у §8. -->

| Aspect | Target | Measurement |
|---|---|---|
| Latency p95 головного read | ≤ 250 ms | метрика ендпойнта <name> |
| Latency p95 головного write | ≤ 150 ms | метрика ендпойнта <name> |
| Throughput | ≥ 30 req/s на 1 інстанс | k6 smoke у CI |
| Availability | 99.0% | місячне вікно, наслідує SLO хостингу |
| Точність грошей | 0 похибки округлення | minor units (integer Money), без float |

## 6.1 Security / privacy

<!-- prd-forge: data classification (для pet-дефолт internal — особисті записи owner-а);
personal data touched; межа доступу (для single-user — як саме «лише owner», механізм
може бути Open Question); 2-4 abuse cases (сторонній читач, spam-ліміт як межа ручного
користування, injection через нові поля); вердикт security review з причиною. -->

## 7. Metrics / KPIs

<!-- prd-forge: ≥3, формат «metric — baseline: X, target: Y за <вікно>».
Для pet-фіч вікно — «наступні N поїздок», не «30 днів»: календар тут сезонний.
baseline=TBD → інлайн-план виміру. Останнім рядком повторюй головний NFR як KPI. -->

## 8. Open questions

<!-- prd-forge: 2-4 checkbox-питання, кожне з owner + due (дата або стадія-тригер).
Сюди ж мігрують Save-as-OQ зі Socratic loop. «TBD» без owner — антипатерн. -->

- [ ] <питання>? Default зараз: <X>. — owner: <хто>, due: <дата або стадія>

## 9. Migration impact

<!-- prd-forge: дельта даних одним із трьох: «нове поле <сутність>.<поле> (тип,
nullable?)» / «нова сутність <name>» / «нічого нового — тільки обчислення поверх
наявних даних». Кожне нове поле = SQL-файл у migrations/ на стадії data model.
Це не HOW (без DDL) — це чесна назва дельти, головного драйвера оцінки. -->
