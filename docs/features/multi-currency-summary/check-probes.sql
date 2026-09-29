-- Негативні проби для scripts/db-roundtrip.sh --probes: кожен рядок ПОВИНЕН упасти на названому CHECK.
-- Сид roundtrip: поїздка ...0001 без budget, витрата ...e001 без курсу.
UPDATE expenses SET rate_nano = 0, rate_set_at = now() WHERE id = '00000000-0000-7000-8000-00000000e001'; -- expect: expenses_rate_nano_positive_chk
UPDATE expenses SET rate_nano = -912300000, rate_set_at = now() WHERE id = '00000000-0000-7000-8000-00000000e001'; -- expect: expenses_rate_nano_positive_chk
UPDATE expenses SET rate_nano = 912300000 WHERE id = '00000000-0000-7000-8000-00000000e001'; -- expect: expenses_rate_snapshot_pair_chk
UPDATE expenses SET rate_set_at = now() WHERE id = '00000000-0000-7000-8000-00000000e001'; -- expect: expenses_rate_snapshot_pair_chk
UPDATE trips SET budget_minor = 100000 WHERE id = '00000000-0000-7000-8000-000000000001'; -- expect: trips_budget_has_currency_chk
UPDATE trips SET budget_minor = -1, base_currency = 'EUR' WHERE id = '00000000-0000-7000-8000-000000000001'; -- expect: trips_budget_minor_nonneg_chk
