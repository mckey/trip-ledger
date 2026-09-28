-- Breaking change, крок 2/3 — BACKFILL. Супутник: ../backfill-currency-code.md (ETA, повтор, ручний розбір).
-- Файл містить РІВНО один оператор DO: COMMIT усередині дозволений лише коли DO виконується
-- поза блоком транзакції, а golang-migrate шле файл одним Exec без BEGIN.
-- UUID-курсор по id, батч 1000, кожен батч — окрема транзакція; повторний запуск бере лише currency_code IS NULL.
-- Значення, що після UPPER/BTRIM не схожі на ISO 4217, НЕ чіпаються — лишаються NULL і блокують крок 3.
DO $$
DECLARE
    cursor_id TEXT := '';
    batch_last TEXT;
BEGIN
    LOOP
        WITH batch AS (
            SELECT id
            FROM expenses
            WHERE id > cursor_id AND currency_code IS NULL
            ORDER BY id
            LIMIT 1000
        ), filled AS (
            UPDATE expenses e
            SET currency_code = UPPER(BTRIM(e.currency))
            FROM batch b
            WHERE e.id = b.id
              AND UPPER(BTRIM(e.currency)) ~ '^[A-Z]{3}$'
            RETURNING e.id
        )
        SELECT max(id) INTO batch_last FROM batch;

        EXIT WHEN batch_last IS NULL;
        cursor_id := batch_last;
        COMMIT;
    END LOOP;
END $$;
