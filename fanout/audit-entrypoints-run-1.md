# Workflow audit-entrypoints — прогін 1 (урок 7.4, складний рівень)

Коміт `e80e6ad`, run `wf_2baf1870-f75`. Сценарій: [.claude/workflows/audit-entrypoints.mjs](../.claude/workflows/audit-entrypoints.mjs), команда `/audit-entrypoints`.

Структура: `pipeline(21 елемент, audit → verify)`; audit — 1 агент на елемент (sonnet), verify — на кожну high/medium знахідку 2 сліпих верифікатори з різними лінзами (READ / REPRODUCE / GUARDED-ELSEWHERE, модель сесії) у `parallel()`, `while` додає третього, поки два голоси не зійдуться.

## Лічильники

| | Агентів | Cache read | Cache write |
|---|---|---|---|
| Audit (sonnet) | 21 | 8.87M | 0.62M |
| Verify (opus) | 45 | 8.66M | 1.13M |
| **Разом** | **66** | 17.5M | 1.75M |

Лічильник workflow: 3.90M токенів, 352 tool calls, 5 хв 44 с. Для порівняння: один виконавець T0 з хвилі 2 (контракт, сопоставимий обсяг читання) — 189k.

Знахідок сирих 35 → 14 low/T12 не верифікувались → 21 пройшли збіжність → **15 confirmed, 6 відфільтровано**, 3 рази знадобився третій голос.

## Confirmed → унікальні проблеми (15 → 7)

| # | Проблема | Де | Разів знайдено | Статус |
|---|---|---|---|---|
| 1 | Нема error-middleware; Express 5 finalhandler без `NODE_ENV` віддає stack trace у 500 | `src/presentation/app.ts:9` | 4 (POST /trips, GET /trips, GET /trips/:id, GET expenses) | **нове, high** |
| 2 | Postgres не пише/не читає budget — InMemory працює, Postgres мовчки губить | `PostgresTripRepository.ts:16` | 4 | відомо: це T3 (не зроблена) |
| 3 | GET expenses / summary на неіснуючу поїздку → 200 `[]` | `expensesRouter.ts:48,52`, `GetTripSummary.ts:13` | 3 | відомо: F4 в api-sync-report |
| 4 | `amount` без верхньої межі → переповнення INTEGER у Postgres → 500 | `expensesRouter.ts:11` | 1 | **нове, medium** |
| 5 | `CreateTrip`/`Trip` не валідують title/country — вся перевірка лише в zod | `CreateTrip.ts:15` | 1 | нове, medium |
| 6 | TOCTOU між `canAcceptExpenses()` і `save()` в AddExpense | `AddExpense.ts:23` | 1 | 2✓/1✗, нове |
| 7 | InMemory-репозиторій віддає живі посилання — маскує mutate-without-save | `InMemoryTripRepository.ts:8` | 1 | 2✓/1✗, тест-інфра |

## Що відфільтрувала збіжність (6)

| Твердження | Голоси | Чому впало |
|---|---|---|
| SetTripBudget: нуль/від'ємний budget кидає голий `Error` | 0/2 | факт правдивий, але шкоди нема: use case не змонтований у роутер (REPRODUCE не побудував запит). Це рівно те «відкрите», яке виконавець T4 приніс у хвилі 2 |
| Money кидає нетипізований Error → 500 | 0/2 | GUARDED-ELSEWHERE: zod `int().nonnegative()` відсікає раніше, 422 |
| BudgetBlock: регістрозалежне порівняння валют | 0/2 | BudgetBlock ще ніде не викликається (T6) |
| FinishTrip: not-found як голий Error | 0/2 | FinishTrip не змонтований |
| TripRepositoryStatusPort: TOCTOU exists/canAccept | 0/2 | видалення поїздки в коді не існує |
| TripRepositoryBudgetPort: null = «нема поїздки» і «нема budget» | 1/2 | тайбрейк: контракт порту так і задокументований |

## Висновки

- Широта окупилась частково. Нові й справжні — #1 (витік стека, high) і #4 (переповнення → 500); їх знайшов би й один агент. Цінність саме workflow — у фільтрі: 6 правдоподібних тверджень відсіяно з обґрунтуванням, і в confirmed не лишилось жодного «шуму».
- Нарізка «по елементу» ламається на наскрізних дефектах: #1 і #2 знайдено по 4 рази → 16 верифікаторів на два факти. Бар'єр dedup по `file:line` перед Verify зекономив би ~25% агентів — це наступна правка сценарію.
- Збіжність судить про поточний код, а не про план: BudgetBlock/SetTripBudget відфільтровано як «недосяжні», хоча після T6/T10 вони стануть досяжними. Перезапуск `/audit-entrypoints` після T10 — обов'язковий.
- ~3.9M проти ~0.2–0.3M одним агентом ≈ 15×, як і обіцяв урок.
