# Backfill — `expenses.currency_code`

Супутник міграції `migrations/20260928120200_backfill_currency_code_in_expenses.up.sql` (крок 2/3 breaking change `expenses.currency` → `expenses.currency_code`).

## Що робить

Для кожного рядка з `currency_code IS NULL` пише `UPPER(BTRIM(currency))`, якщо результат схожий на ISO 4217 (`^[A-Z]{3}$`). Решту не чіпає: вони лишаються `NULL` і не дадуть кроку 3 виконати `SET NOT NULL`.

Це нормалізація написання коду валюти (`' uah '` → `UAH`), а не зміна валюти: інваріант CONTEXT «витрата завжди зберігає суму й валюту введення» не порушується. Значення, з якого валюту не вгадати (`грн`, `$`), автоматично не переписується — рішення за owner-ом.

## Обсяг і ETA

- SAD §7: 4–6 поїздок на рік × ≤ 300 витрат → ≤ ~2 тис. рядків на рік.
- Батч 1000 рядків, кожен батч — окрема транзакція (`COMMIT` усередині `DO`); на локальному Postgres 17 — ~50 мс на 3 рядки разом з накладними витратами раннера. Для 10 тис. рядків очікувано < 1 с.
- Блокування: лише рядкові блокування батчу; читання й вставки не чекають.

## Повторний запуск

Безпечний: курсор іде по `id`, умова `currency_code IS NULL` пропускає вже заповнені рядки. Перервався посередині — просто запустити знову.

## Перед кроком 3 (contract)

```sql
SELECT id, currency FROM expenses WHERE currency_code IS NULL ORDER BY id;
```

Має повернути 0 рядків. Якщо ні — виправити `currency` вручну (owner вирішує, яка це валюта), потім повторити backfill.

## Якщо contract уже впав

Перевірено на roundtrip (2026-09-28): рядок з `currency = 'грн'` лишається `NULL`, contract падає з `column "currency_code" ... contains null values`, golang-migrate позначає версію `20260928120300 (dirty)`. Contract виконується одним Exec, тож частково не застосовується.

1. Виправити дані: `UPDATE expenses SET currency = '<ISO>' WHERE id = '<id>';`
2. `migrate force 20260928120100` — повернути версію на крок перед backfill, щоб він перезапустився.
3. `migrate up` — backfill добирає виправлені рядки, contract проходить.
