#!/usr/bin/env bash
# Roundtrip staged-міграцій фічі: baseline (живі migrations/*.sql + сид) → up → down → up.
# Порівнює: стан після down == baseline (каталог, без урахування порядку колонок),
#           стан після другого up == після першого (pg_dump -s байт-у-байт).
#
#   scripts/db-roundtrip.sh docs/features/trip-budget/migrations
#
# Раннер: golang-migrate (docker-образ migrate/migrate) для пар *.up.sql / *.down.sql.
set -euo pipefail
export MSYS_NO_PATHCONV=1 # Git Bash на Windows не повинен переписувати /migrations

STAGED="${1:?usage: $0 <staged-migrations-dir>}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOST_ROOT="$(cd "$ROOT" && (pwd -W 2>/dev/null || pwd))"
NET="$(basename "$ROOT")_default"
DB_URL="postgres://ledger:ledger@db:5432/trip_ledger?sslmode=disable"
OUT="$(mktemp -d)"

psql_db() { docker compose -f "$HOST_ROOT/docker-compose.yml" exec -T db psql -U ledger -d trip_ledger -v ON_ERROR_STOP=1 -q "$@"; }
migrate() {
  docker run --rm --network "$NET" -v "$HOST_ROOT/$STAGED:/migrations:ro" \
    migrate/migrate:v4.18.3 -path=/migrations -database "$DB_URL" "$@"
}
catalog() { # схема без порядку колонок і без службової таблиці раннера
  psql_db -At -c "
    SELECT 'col|' || table_name || '|' || column_name || '|' || data_type || '|' ||
           coalesce(character_maximum_length::text, '-') || '|' || is_nullable || '|' || coalesce(column_default, '-')
      FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name <> 'schema_migrations'
    UNION ALL
    SELECT 'con|' || conrelid::regclass || '|' || conname || '|' || pg_get_constraintdef(oid)
      FROM pg_constraint WHERE connamespace = 'public'::regnamespace AND conrelid::regclass::text <> 'schema_migrations'
    UNION ALL
    SELECT 'idx|' || indexname || '|' || indexdef
      FROM pg_indexes WHERE schemaname = 'public' AND tablename <> 'schema_migrations'
    ORDER BY 1;"
}
dump() { docker compose -f "$HOST_ROOT/docker-compose.yml" exec -T db pg_dump -s -U ledger -d trip_ledger --exclude-table=schema_migrations | grep -v -E '^(-- Dumped|\\restrict|\\unrestrict)'; }
data() { psql_db -At -c "SELECT id || ' | ' || row_to_json(e)::text FROM expenses e ORDER BY id;"; }
step() { printf '\n=== %s ===\n' "$*"; }

step "db: postgres:17-alpine"
docker compose -f "$HOST_ROOT/docker-compose.yml" up -d --wait db >/dev/null
psql_db -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

step "baseline: live migrations/*.sql + seed"
for f in "$ROOT"/migrations/*.sql; do echo "apply $(basename "$f")"; psql_db < "$f"; done
psql_db <<'SQL'
INSERT INTO trips (id, title, country, starts_at, ends_at, status) VALUES
  ('00000000-0000-7000-8000-000000000001', 'Test Trip', 'PT', '2026-10-01', '2026-10-15', 'planned');
INSERT INTO expenses (id, trip_id, amount_minor, currency, category, spent_at) VALUES
  ('00000000-0000-7000-8000-00000000e001', '00000000-0000-7000-8000-000000000001', 1500, 'EUR',  'food',      '2026-10-02'),
  ('00000000-0000-7000-8000-00000000e002', '00000000-0000-7000-8000-000000000001', 4200, 'eur',  'transport', '2026-10-02'),
  ('00000000-0000-7000-8000-00000000e003', '00000000-0000-7000-8000-000000000001',  900, ' uah ', 'other',    '2026-10-03');
SQL
catalog > "$OUT/0-baseline.catalog"; data > "$OUT/0-baseline.data"; cat "$OUT/0-baseline.data"

step "migrate up"
migrate up
catalog > "$OUT/1-up.catalog"; dump > "$OUT/1-up.dump"; data | tee "$OUT/1-up.data"

step "migrate down -all"
migrate down -all
catalog > "$OUT/2-down.catalog"; data | tee "$OUT/2-down.data"

step "migrate up (again)"
migrate up
catalog > "$OUT/3-up.catalog"; dump > "$OUT/3-up.dump"; data > "$OUT/3-up.data"
migrate version

step "compare"
ok=1
if diff -u "$OUT/0-baseline.catalog" "$OUT/2-down.catalog"; then echo "OK  down == baseline (columns, types, nullability, defaults, constraints, indexes)"; else ok=0; echo "FAIL down != baseline"; fi
if diff -u "$OUT/1-up.dump" "$OUT/3-up.dump"; then echo "OK  up#2 == up#1 (pg_dump -s, byte-for-byte)"; else ok=0; echo "FAIL up#2 != up#1"; fi
if diff -u "$OUT/1-up.data" "$OUT/3-up.data"; then echo "OK  data after up#2 == after up#1"; else ok=0; echo "FAIL data drift between ups"; fi
rm -rf "$OUT"
[ "$ok" = 1 ] && echo "ROUNDTRIP OK" || { echo "ROUNDTRIP FAILED"; exit 1; }
