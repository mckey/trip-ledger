-- Breaking change, крок 1/3 — EXPAND.
-- expenses.currency TEXT (будь-який непорожній рядок) → currency_code VARCHAR(3) NOT NULL (ISO 4217).
-- Навіщо trip-budget: counted expense = валюта витрати дорівнює base currency (AC-06),
-- а 'uah' / ' EUR' сьогодні мовчки стають uncounted.
--
-- Нова колонка nullable; код цього PR пише обидві колонки (dual-write), читає стару.
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS currency_code VARCHAR(3) NULL;
-- Стару колонку послаблюємо вже тут: код кроку 3 перестане її писати ДО того,
-- як contract-міграція її видалить, і NOT NULL на ній зламав би вставки між деплоєм і міграцією.
ALTER TABLE expenses ALTER COLUMN currency DROP NOT NULL;
