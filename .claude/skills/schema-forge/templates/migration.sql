-- <slug>: <що змінюється одним реченням> (<AC / ADR>).
-- Раннер: node-pg-migrate, файл виконується в його транзакції (--single-transaction).
-- CONCURRENTLY / батчі з COMMIT сюди не можна — для них migration-notx.js.

-- Up Migration
ALTER TABLE <table> ADD COLUMN IF NOT EXISTS <column> <TYPE> NULL;
-- CHECK лише класу (а) дзеркало VO з shared/ або (б) форма складеного атрибута:
ALTER TABLE <table> ADD CONSTRAINT <table>_<rule>_chk CHECK (<expr>);

-- Down Migration
ALTER TABLE <table> DROP CONSTRAINT IF EXISTS <table>_<rule>_chk;
ALTER TABLE <table> DROP COLUMN IF EXISTS <column>;
