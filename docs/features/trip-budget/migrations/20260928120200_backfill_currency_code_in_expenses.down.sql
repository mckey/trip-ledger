-- Реверс backfill: повертаємо колонку в стан «щойно додана».
-- Втрат немає: до кроку 3 джерело правди — expenses.currency, код кроку 1 пише обидві.
UPDATE expenses SET currency_code = NULL WHERE currency_code IS NOT NULL;
