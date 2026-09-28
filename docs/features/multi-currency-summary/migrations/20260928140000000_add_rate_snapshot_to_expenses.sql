-- multi-currency-summary: rate snapshot як атрибут витрати (ADR-0001), Rate ×10⁹ у BIGINT (ADR-0002).
-- Expand-only, backfill немає: курс 1 для base currency похідний на читанні (ADR-0003).
-- Раннер: node-pg-migrate, файл у транзакції раннера.
-- CHECK лише дозволених класів (.claude/rules/migrations.md):
--   rate_nano_positive — дзеркало інваріанта Rate > 0 з shared/ (ADR-0002);
--   rate_snapshot_pair — форма складеного атрибута: курс і час його задання існують лише разом.

-- Up Migration
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS rate_nano BIGINT NULL;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS rate_set_at TIMESTAMPTZ NULL;
ALTER TABLE expenses ADD CONSTRAINT expenses_rate_nano_positive_chk CHECK (rate_nano > 0);
ALTER TABLE expenses ADD CONSTRAINT expenses_rate_snapshot_pair_chk CHECK ((rate_nano IS NULL) = (rate_set_at IS NULL));

-- Down Migration
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_rate_snapshot_pair_chk;
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_rate_nano_positive_chk;
ALTER TABLE expenses DROP COLUMN IF EXISTS rate_set_at;
ALTER TABLE expenses DROP COLUMN IF EXISTS rate_nano;
