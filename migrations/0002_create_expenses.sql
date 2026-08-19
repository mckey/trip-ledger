-- 0002: expenses table (expenses vertical slice)
CREATE TABLE IF NOT EXISTS expenses (
    id           TEXT PRIMARY KEY,
    trip_id      TEXT NOT NULL REFERENCES trips (id),
    amount_minor INTEGER NOT NULL CHECK (amount_minor >= 0),
    currency     TEXT NOT NULL,
    category     TEXT NOT NULL
                 CHECK (category IN ('transport', 'lodging', 'food', 'tickets', 'other')),
    spent_at     DATE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_expenses_trip_id ON expenses (trip_id);
