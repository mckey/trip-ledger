-- Breaking change, крок 3/3 — CONTRACT. Окремий PR; ПОРЯДОК ДЕПЛОЮ: спершу код, що не пише і не читає
-- expenses.currency, потім ця міграція (post-deploy).
-- Передумова: SELECT count(*) FROM expenses WHERE currency_code IS NULL = 0 (див. ../backfill-currency-code.md).
-- Таблиця мала (SAD §7: ≤ ~2 тис. рядків на рік), тож повний скан під SET NOT NULL — мілісекунди.
ALTER TABLE expenses ALTER COLUMN currency_code SET NOT NULL;
ALTER TABLE expenses DROP COLUMN IF EXISTS currency;
