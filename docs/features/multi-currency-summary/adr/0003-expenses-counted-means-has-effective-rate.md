---
status: Accepted
owner: "Vladimir Makarov"
reviewers: []
updated_at: "2026-09-02"
feature_size: S
stage: "03"
ticket: "-"
bc: "expenses"
---

# 0003 — Counted expense = витрата з ефективним курсом; converted total і remaining — з однієї `BudgetBlock`; курс 1 для base currency похідний, без backfill

- **Status:** Accepted
- **Date:** 2026-09-02
- **Deciders:** Vladimir Makarov (owner фічі, архітектор) — Socratic walk `arch-forge`

## Контекст

trip-budget визначила counted expense як «витрату у base currency», і її `BudgetBlock` (ADR-0002 тієї фічі) рахує remaining лише з таких витрат. PRD цієї фічі каже інакше: witрата в чужій валюті з rate snapshot має входити у порівняння з budget (Goal 3, AC-09), а витрата у base currency — отримувати курс 1 сама, без поля (AC-06). PRD §9 запропонував реалізувати «курс 1» backfill-ом у міграції. Питання: як переозначити counted, де рахувати converted total і чи потрібен backfill.

## Радіус впливу (4 критерії)

| Незворотнє (≥ 3 днів) | ≥ 2 модулі | Чесна альтернатива | Зачіпає базу |
|---|---|---|---|
| ✗ — семантика живе в одній чистій функції; змінити — години | ✓ — `expenses` (BudgetBlock, підсумок) + presentation-контракт + документи trip-budget (CONTEXT, SAD §12) | ✓ — два окремі підсумки; «все або нічого» | ✗ — навпаки, знімає backfill з PRD §9 |

2 з 4 → ADR.

## Драйвери рішення

- PRD §2 Goal 3: «залишок бюджету перестає брехати на мультивалютних поїздках»; §5 AC-09: converted total і залишок «живляться з одного джерела».
- PRD §5 AC-06: витрата у base currency — курс 1 сам, поле не питається, одразу counted; AC-03/AC-04: converted total лише з витрат із курсом + чесний лічильник без курсу.
- CONTEXT `## Invariants`: «будь-який перерахунок — окремий шар поверх, не мутація витрати».
- trip-budget ADR-0002: `BudgetBlock` як єдина функція, яку наступна фіча «розширить, не додаючи другого агрегата».

## Розглянуті варіанти

1. **Єдина `BudgetBlock` з ефективним курсом.** Ефективний курс витрати = явний `rate` → інакше `Rate.ONE`, якщо валюта витрати = base currency → інакше відсутній. Counted = має ефективний курс; converted total = Σ `rate.apply(amount)`; remaining = budget − та сама Σ; «без курсу» для converted total і «uncounted» для remaining — одне число. Курс 1 не зберігається і не backfill-иться — обчислюється на читанні.
2. **Залишити семантику trip-budget і додати converted total окремо.** Counted лишається «у base currency», converted total — окрема функція над rated-витратами. Два джерела правди: remaining і далі ігнорує витрати з курсом — прямо проти Goal 3 і AC-09.
3. **«Все або нічого».** Converted total і remaining показуються лише коли **кожна** витрата має курс, інакше `null`. Чесно, але ховає часткову інформацію і суперечить AC-03 («порахований лише з витрат, що мають rate snapshot») та AC-04 (лічильник поруч із total).

## Результат рішення

**Обрано:** Варіант 1 — єдина `BudgetBlock`, counted = ефективний курс, курс 1 похідний.

**Чому переміг:** єдиний варіант, у якому AC-09 виконується без другого агрегата, а AC-06 — без запису у БД: правило «валюта витрати = base currency ⇒ 1» — факт, який видно з двох уже наявних полів, тож зберігати його (і backfill-ити старі рядки) — дублювання. Побічно це знімає крос-BC запис, який інакше довелося б робити при пізнішому заданні base currency поїздки.

## Наслідки

**Позитивні:**
- Converted total і remaining ніколи не розходяться — одна Σ, одне округлення (QG-1).
- Backfill з PRD §9 не потрібен; старі витрати у base currency counted одразу після міграції 0004.
- Задання base currency пізніше нічого не переписує у `expenses` — інваріант «перерахунок — шар поверх» тримається буквально.

**Негативні:**
- Визначення counted/uncounted у `docs/features/trip-budget/CONTEXT.md` і SAD trip-budget §12 стають неточними → оновити через `fix-term` до реалізації (sad.md §11).
- PRD §9 цієї фічі говорить про backfill — потрібен back-port одного рядка (sad.md §11).

**Нейтральні:**
- Поїздка без base currency: `converted: null`, `budget: null` — підсумок як сьогодні; жодних помилок.
- Якщо колись з'явиться «збережений курс 1» заради аудиту — це один UPDATE, семантика не зміниться.

## Дельта даних

- Немає. Навпаки: знімає backfill, передбачений PRD §9.

## Links

- PRD: [[../PRD.md]] §2 Goal 3, §5 AC-03/AC-04/AC-06/AC-09, §9 Migration impact (backfill — замінено похідним правилом)
- SAD: [[../sad.md]] §4 Стратегія (стовп 3) · §5 Building blocks (`BudgetBlock` ~) · §12 Glossary (counted/uncounted уточнено)
- Сусідній ADR: [[0001-expenses-rate-snapshot-as-nullable-column-on-expenses]] — звідки береться явний курс
- Сусідній ADR: [[0004-cross-base-currency-standalone-locked-via-rated-expenses-port]] — чому base currency існує й без budget (без неї немає «ефективного курсу 1»)
- Сусідній ADR (інша фіча): [[../../trip-budget/adr/0002-remaining-computed-in-expenses-via-trip-budget-port]] — уточнює його визначення counted; функція та сама, семантика ширша
- Інваріант словника: «будь-який перерахунок — окремий шар поверх, не мутація витрати» — захищає: курс 1 виводиться на читанні, у БД нічого не пишеться
