-- trip-budget: budget і base currency як атрибути поїздки (ADR-0001).
-- Expand-only: обидві колонки nullable, старі рядки валідні без backfill.
-- Без CHECK-обмежень за course default «DB as dumb storage»: budget > 0 і парність
-- budget/base currency перевіряє Trip.setBudget() + zod у presentation.
ALTER TABLE trips ADD COLUMN IF NOT EXISTS budget_minor INTEGER NULL;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS base_currency VARCHAR(3) NULL;
