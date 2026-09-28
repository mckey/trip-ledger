-- Реверс contract: повертаємо стару колонку і заповнюємо з нової.
-- Дані відновлюються в канонічній формі: сирі написання ('uah', ' EUR') після кроку 3 уже не існують.
-- Колонка повертається в кінець таблиці — Postgres не вміє вставити її на старе місце без перезапису.
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS currency TEXT NULL;
UPDATE expenses SET currency = currency_code WHERE currency IS NULL;
ALTER TABLE expenses ALTER COLUMN currency_code DROP NOT NULL;
