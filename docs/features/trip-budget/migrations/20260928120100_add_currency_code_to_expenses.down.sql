-- Впаде, якщо вже є рядки без currency (їх міг записати лише код кроку 3) — це свідомий стоп.
ALTER TABLE expenses ALTER COLUMN currency SET NOT NULL;
ALTER TABLE expenses DROP COLUMN IF EXISTS currency_code;
