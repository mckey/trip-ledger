#!/usr/bin/env bash
# Roundtrip staged-міграцій фічі на одноразовому Postgres з docker-compose.yml:
#   baseline = живі migrations/*.sql + сид (+ up-частина staged-передумов сусідніх фіч) → up → down → up.
# Порівнює: стан після down == baseline (каталог: колонки, типи, nullability, defaults, constraints, індекси —
#           без порядку колонок), стан після другого up == після першого (pg_dump -s байт-у-байт),
#           дані після обох up однакові. --probes: кожен рядок файлу — SQL, який ПОВИНЕН впасти (перевірка CHECK).
#
#   scripts/db-roundtrip.sh docs/features/trip-budget/migrations
#   scripts/db-roundtrip.sh docs/features/multi-currency-summary/migrations \
#       --after docs/features/trip-budget/migrations --probes docs/features/multi-currency-summary/check-probes.sql
#
# Раннер визначається форматом файлів: *.up.sql / *.down.sql → golang-migrate (docker migrate/migrate),
# інакше (*.sql з `-- Up Migration` / `-- Down Migration`, *.js) → node-pg-migrate з devDependencies.
set -euo pipefail
export MSYS_NO_PATHCONV=1 # Git Bash на Windows не повинен переписувати /migrations

STAGED="${1:?usage: $0 <staged-dir> [--after <dir>]... [--probes <file>]}"; shift
AFTER=(); PROBES=""
while [ $# -gt 0 ]; do
  case "$1" in
    --after) AFTER+=("$2"); shift 2 ;;
    --probes) PROBES="$2"; shift 2 ;;
    *) echo "unknown arg: $1" >&2; exit 2 ;;
  esac
done

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOST_ROOT="$(cd "$ROOT" && (pwd -W 2>/dev/null || pwd))"
COMPOSE=(docker compose -f "$HOST_ROOT/docker-compose.yml")
NET="$(basename "$ROOT")_default"
OUT="$(mktemp -d)"
if ls "$ROOT/$STAGED"/*.up.sql >/dev/null 2>&1; then RUNNER=golang-migrate; else RUNNER=node-pg-migrate; fi
N_FILES="$(find "$ROOT/$STAGED" -maxdepth 1 -type f \( -name '*.sql' -o -name '*.js' \) ! -name '*.down.sql' | wc -l | tr -d ' ')"

psql_db() { "${COMPOSE[@]}" exec -T db psql -U ledger -d trip_ledger -v ON_ERROR_STOP=1 -q "$@"; }
migrate() { # up | down-all
  if [ "$RUNNER" = golang-migrate ]; then
    local args=(up); [ "$1" = down-all ] && args=(down -all)
    docker run --rm --network "$NET" -v "$HOST_ROOT/$STAGED:/migrations:ro" migrate/migrate:v4.18.3 \
      -path=/migrations -database "postgres://ledger:ledger@db:5432/trip_ledger?sslmode=disable" "${args[@]}"
  else
    local args=(up); [ "$1" = down-all ] && args=(down "$N_FILES")
    (cd "$ROOT" && DATABASE_URL="postgres://ledger:ledger@localhost:54329/trip_ledger" \
      ./node_modules/.bin/node-pg-migrate "${args[@]}" -m "$STAGED" --verbose false) 2>&1 | grep -E '^(> |### MIGRATION)|Migrations complete|No migrations|error' || true
  fi
}
up_section() { # up-частина staged-файлу сусідньої фічі
  case "$1" in
    *.up.sql) cat "$1" ;;
    *.sql) awk 'BEGIN{p=1} /^[[:space:]]*--[[:space:]-]*[Uu]p [Mm]igration/{p=1;next} /^[[:space:]]*--[[:space:]-]*[Dd]own [Mm]igration/{p=0} p' "$1" ;;
  esac
}
catalog() {
  psql_db -At -c "
    SELECT 'col|' || table_name || '|' || column_name || '|' || data_type || '|' ||
           coalesce(character_maximum_length::text, '-') || '|' || is_nullable || '|' || coalesce(column_default, '-')
      FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name NOT IN ('schema_migrations', 'pgmigrations')
    UNION ALL
    SELECT 'con|' || conrelid::regclass || '|' || conname || '|' || pg_get_constraintdef(oid)
      FROM pg_constraint
     WHERE connamespace = 'public'::regnamespace AND conrelid::regclass::text NOT IN ('schema_migrations', 'pgmigrations')
    UNION ALL
    SELECT 'idx|' || indexname || '|' || indexdef
      FROM pg_indexes WHERE schemaname = 'public' AND tablename NOT IN ('schema_migrations', 'pgmigrations')
    ORDER BY 1;"
}
dump() {
  "${COMPOSE[@]}" exec -T db pg_dump -s -U ledger -d trip_ledger \
    --exclude-table=schema_migrations --exclude-table=pgmigrations --exclude-table=pgmigrations_id_seq \
    | grep -v -E '^(-- Dumped|\\restrict|\\unrestrict)'
}
data() { psql_db -At -c "SELECT 'trip ' || row_to_json(t)::text FROM trips t UNION ALL SELECT 'exp  ' || row_to_json(e)::text FROM expenses e ORDER BY 1;"; }
step() { printf '\n=== %s ===\n' "$*"; }

step "db: $(grep -m1 -o 'postgres:[^ ]*' "$ROOT/docker-compose.yml"), runner: $RUNNER, staged: $STAGED ($N_FILES)"
"${COMPOSE[@]}" up -d --wait db >/dev/null
psql_db -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

step "baseline: live migrations/*.sql + seed${AFTER:+ + staged prerequisites}"
for f in "$ROOT"/migrations/*.sql; do echo "apply $(basename "$f")"; psql_db < "$f"; done
psql_db <<'SQL'
INSERT INTO trips (id, title, country, starts_at, ends_at, status) VALUES
  ('00000000-0000-7000-8000-000000000001', 'Test Trip', 'PT', '2026-10-01', '2026-10-15', 'planned');
INSERT INTO expenses (id, trip_id, amount_minor, currency, category, spent_at) VALUES
  ('00000000-0000-7000-8000-00000000e001', '00000000-0000-7000-8000-000000000001', 1500, 'EUR',  'food',      '2026-10-02'),
  ('00000000-0000-7000-8000-00000000e002', '00000000-0000-7000-8000-000000000001', 4200, 'eur',  'transport', '2026-10-02'),
  ('00000000-0000-7000-8000-00000000e003', '00000000-0000-7000-8000-000000000001',  900, ' uah ', 'other',    '2026-10-03');
SQL
for d in "${AFTER[@]}"; do
  for f in $(find "$ROOT/$d" -maxdepth 1 -type f -name '*.sql' ! -name '*.down.sql' | sort); do
    echo "apply (prerequisite) $d/$(basename "$f")"; up_section "$f" | psql_db
  done
done
catalog > "$OUT/0-baseline.catalog"; data > "$OUT/0-baseline.data"; cat "$OUT/0-baseline.data"

step "migrate up"
migrate up
catalog > "$OUT/1-up.catalog"; dump > "$OUT/1-up.dump"; data | tee "$OUT/1-up.data"

if [ -n "$PROBES" ]; then
  step "probes (each statement must FAIL)"
  while IFS= read -r stmt; do
    case "$stmt" in ''|--*) continue ;; esac
    if err="$(printf 'BEGIN;\n%s\nROLLBACK;\n' "$stmt" | psql_db 2>&1)"; then
      echo "FAIL accepted: $stmt"; echo PROBE_FAILED > "$OUT/probe"
    else
      echo "OK   rejected: $stmt"; echo "     $(echo "$err" | grep -m1 -o 'violates[^"]*"[^"]*"')"
    fi
  done < "$ROOT/$PROBES"
fi

step "migrate down (all staged)"
migrate down-all
catalog > "$OUT/2-down.catalog"; data | tee "$OUT/2-down.data"

step "migrate up (again)"
migrate up
catalog > "$OUT/3-up.catalog"; dump > "$OUT/3-up.dump"; data > "$OUT/3-up.data"

step "compare"
ok=1
if diff -u "$OUT/0-baseline.catalog" "$OUT/2-down.catalog"; then echo "OK  down == baseline (columns, types, nullability, defaults, constraints, indexes)"; else ok=0; echo "FAIL down != baseline"; fi
if diff -u "$OUT/1-up.dump" "$OUT/3-up.dump"; then echo "OK  up#2 == up#1 (pg_dump -s, byte-for-byte)"; else ok=0; echo "FAIL up#2 != up#1"; fi
if diff -u "$OUT/1-up.data" "$OUT/3-up.data"; then echo "OK  data after up#2 == after up#1"; else ok=0; echo "FAIL data drift between ups"; fi
[ -f "$OUT/probe" ] && { ok=0; echo "FAIL a probe was accepted"; }
rm -rf "$OUT"
[ "$ok" = 1 ] && echo "ROUNDTRIP OK" || { echo "ROUNDTRIP FAILED"; exit 1; }
