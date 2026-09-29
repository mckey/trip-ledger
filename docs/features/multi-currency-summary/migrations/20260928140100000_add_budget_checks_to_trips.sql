-- multi-currency-summary: CHECK-и бюджету на trips — fallback-шлях ADR-0004 «ALTER … ADD CHECK у 0004»,
-- бо staged-міграція trip-budget (20260928120000) вийшла без CHECK взагалі.
-- Передумова промоції: trip-budget/20260928120000_add_budget_to_trips.
--   budget_has_currency  — ADR-0004, форма Money: budget без валюти не гроші; base currency без budget дозволена.
--   budget_minor_nonneg  — дзеркало Money ≥ 0 з shared/. Правило «budget > 0» (AC-02) лишається в Trip.setBudget():
--                          це продуктовий поріг, не інваріант Money (amend trip-budget ADR-0001 — див. data-model.md).

-- Up Migration
ALTER TABLE trips ADD CONSTRAINT trips_budget_minor_nonneg_chk CHECK (budget_minor >= 0);
ALTER TABLE trips ADD CONSTRAINT trips_budget_has_currency_chk CHECK (budget_minor IS NULL OR base_currency IS NOT NULL);

-- Down Migration
ALTER TABLE trips DROP CONSTRAINT IF EXISTS trips_budget_has_currency_chk;
ALTER TABLE trips DROP CONSTRAINT IF EXISTS trips_budget_minor_nonneg_chk;
