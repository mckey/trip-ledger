-- 0001: trips table (F1 vertical slice)
CREATE TABLE IF NOT EXISTS trips (
    id          TEXT PRIMARY KEY,
    title       TEXT NOT NULL,
    country     TEXT NOT NULL,
    starts_at   DATE NOT NULL,
    ends_at     DATE NOT NULL,
    status      TEXT NOT NULL DEFAULT 'planned'
                CHECK (status IN ('planned', 'active', 'finished')),
    CHECK (ends_at >= starts_at)
);

CREATE INDEX IF NOT EXISTS idx_trips_status ON trips (status);
