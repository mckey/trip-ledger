#!/usr/bin/env bash
# Roundtrip staged-міграцій фічі на одноразовому Postgres з docker-compose.yml:
#   baseline = живі migrations/*.sql + сид (+ staged-передумови сусідніх фіч) → up → down → up.
# Перевіряє:
#   - раннер справді застосував усі файли (таблиця раннера після up == N файлів, після down == 0);
#   - down == baseline за каталогом (колонки, типи, nullability, defaults, constraints, індекси; без порядку колонок)
#     і за набором рядків (PK trips/expenses);
#   - up#2 == up#1 за pg_dump -s байт-у-байт і за даними;
#   - --probes: кожен рядок — SQL, який ПОВИНЕН упасти саме на CHECK; `-- expect: <constraint>` у кінці рядка
#     вимагає конкретне обмеження.
#
#   scripts/db-roundtrip.sh docs/features/trip-budget/migrations
#   scripts/db-roundtrip.sh docs/features/multi-currency-summary/migrations \
#       --after docs/features/trip-budget/migrations --probes docs/features/multi-currency-summary/check-probes.sql
#
# Раннер визначається форматом файлів: *.up.sql / *.down.sql → golang-migrate (docker migrate/migrate),
# інакше (*.sql з `-- Up Migration` / `-- Down Migration`, *.js) → node-pg-migrate з devDependencies.
#
# REPO-SPECIFIC (trip-ledger): креденшели/порт/ім'я проєкту з docker-compose.yml, SEED і data()/ids() нижче.
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
abs() { case "$1" in /*|[A-Za-z]:*) (cd "$1" && pwd) ;; *) (cd "$ROOT/$1" && pwd) ;; esac; }
winpath() { (cd "$1" && (pwd -W 2>/dev/null || pwd)); }
STAGED_ABS="$(abs "$STAGED")"
COMPOSE=(docker compose -f "$(winpath "$ROOT")/docker-compose.yml")
# REPO-SPECIFIC: у docker-compose.yml задано `name: trip-ledger`, тож мережа має стабільне ім'я.
NET="trip-ledger_default"
DB_HOST_URL="postgres://ledger:ledger@localhost:54329/trip_ledger"
OUT="$(mktemp -d)"
trap 'rm -rf "$OUT"' EXIT
if ls "$STAGED_ABS"/*.up.sql >/dev/null 2>&1; then RUNNER=golang-migrate; else RUNNER=node-pg-migrate; fi
N_FILES="$(find "$STAGED_ABS" -maxdepth 1 -type f \( -name '*.sql' -o -name '*.js' \) ! -name '*.down.sql' | wc -l | tr -d ' ')"
NPM_BIN="$ROOT/node_modules/.bin/node-pg-migrate"

psql_db() { "${COMPOSE[@]}" exec -T db psql -U ledger -d trip_ledger -v ON_ERROR_STOP=1 -q "$@"; }
node_migrate() { # <dir> <table> up|down-all <log-name>
  local dir="$1" table="$2" dirn="$3" log="$OUT/$4.log" args=(up) n
  if [ "$dirn" = down-all ]; then
    n="$(find "$dir" -maxdepth 1 -type f \( -name '*.sql' -o -name '*.js' \) | wc -l | tr -d ' ')"; args=(down "$n")
  fi
  if ! (cd "$ROOT" && DATABASE_URL="$DB_HOST_URL" "$NPM_BIN" "${args[@]}" -m "$(winpath "$dir")" -t "$table" --verbose false) >"$log" 2>&1; then
    cat "$log"; echo "FAIL node-pg-migrate ${args[*]} ($dir)"; exit 1
  fi
  # legacy-шум раннера («Can't determine timestamp for 0001») тут не з'являється: -m вказує лише staged-теку
  grep -E '^(> |### MIGRATION)|Migrations complete|No migrations' "$log" || true
}
migrate() { # up | down-all
  if [ "$RUNNER" = golang-migrate ]; then
    local args=(up); [ "$1" = down-all ] && args=(down -all)
    docker run --rm --network "$NET" -v "$(winpath "$STAGED_ABS"):/migrations:ro" migrate/migrate:v4.18.3 \
      -path=/migrations -database "postgres://ledger:ledger@db:5432/trip_ledger?sslmode=disable" "${args[@]}"
  else
    node_migrate "$STAGED_ABS" pgmigrations "$1" "staged-$1"
  fi
}
applied() { # скільки staged-файлів раннер вважає застосованими
  if [ "$RUNNER" = golang-migrate ]; then
    # golang-migrate тримає один рядок: поточну версію і dirty. Застосовано все == версія останнього файлу, не dirty.
    local v last
    v="$(psql_db -At -c "SELECT CASE WHEN to_regclass('schema_migrations') IS NULL THEN '' ELSE (SELECT coalesce(max(version)::text, '') || CASE WHEN bool_or(dirty) THEN ' dirty' ELSE '' END FROM schema_migrations) END;")"
    last="$(find "$STAGED_ABS" -maxdepth 1 -name '*.up.sql' -printf '%f\n' | sort | tail -1 | cut -d_ -f1)"
    if [ -z "$v" ]; then echo 0; elif [ "$v" = "$last" ]; then echo "$N_FILES"; else echo "version:$v"; fi
  else
    psql_db -At -c "SELECT CASE WHEN to_regclass('pgmigrations') IS NULL THEN 0 ELSE (SELECT count(*) FROM pgmigrations) END;"
  fi
}
expect_applied() { local got; got="$(applied)"; [ "$got" = "$1" ] || { echo "FAIL runner applied $got file(s), expected $1"; exit 1; }; echo "runner table: $got applied"; }
up_section() { # up-частина staged-файлу для psql (формат golang-migrate або node-pg-migrate .sql)
  case "$1" in
    *.up.sql) cat "$1" ;;
    *.sql) awk 'BEGIN{p=1} { l=tolower($0) } l ~ /^[[:space:]]*--[[:space:]-]*up[[:space:]]+migration/ {p=1; next} l ~ /^[[:space:]]*--[[:space:]-]*down[[:space:]]+migration/ {p=0} p' "$1" ;;
  esac
}
apply_prerequisite() { # <dir>: golang-пари — psql по up-файлах; формат node-pg-migrate (.sql/.js) — самим раннером
  local d; d="$(abs "$1")"
  if ls "$d"/*.up.sql >/dev/null 2>&1; then
    for f in $(find "$d" -maxdepth 1 -type f -name '*.up.sql' | sort); do
      echo "apply (prerequisite) $1/$(basename "$f")"; up_section "$f" | psql_db
    done
  else
    echo "apply (prerequisite, node-pg-migrate) $1"; node_migrate "$d" pgmigrations_prereq up "prereq-$(basename "$(dirname "$d")")"
  fi
}
SERVICE_TABLES="'schema_migrations', 'pgmigrations', 'pgmigrations_prereq'"
catalog() {
  psql_db -At -c "
    SELECT 'col|' || table_name || '|' || column_name || '|' || data_type || '|' ||
           coalesce(character_maximum_length::text, '-') || '|' || is_nullable || '|' || coalesce(column_default, '-')
      FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name NOT IN ($SERVICE_TABLES)
    UNION ALL
    SELECT 'con|' || conrelid::regclass || '|' || conname || '|' || pg_get_constraintdef(oid)
      FROM pg_constraint
     WHERE connamespace = 'public'::regnamespace AND conrelid::regclass::text NOT IN ($SERVICE_TABLES)
    UNION ALL
    SELECT 'idx|' || indexname || '|' || indexdef
      FROM pg_indexes WHERE schemaname = 'public' AND tablename NOT IN ($SERVICE_TABLES)
    ORDER BY 1;"
}
dump() {
  "${COMPOSE[@]}" exec -T db pg_dump -s -U ledger -d trip_ledger \
    --exclude-table=schema_migrations --exclude-table='pgmigrations*' \
    | grep -v -E '^(-- Dumped|\\restrict|\\unrestrict)'
}
# REPO-SPECIFIC: таблиці даних trip-ledger.
data() { psql_db -At -c "SELECT 'trip ' || row_to_json(t)::text FROM trips t UNION ALL SELECT 'exp  ' || row_to_json(e)::text FROM expenses e ORDER BY 1;"; }
ids() { psql_db -At -c "SELECT 'trip ' || id FROM trips UNION ALL SELECT 'exp  ' || id FROM expenses ORDER BY 1;"; }
step() { printf '\n=== %s ===\n' "$*"; }

step "db: $(grep -m1 -o 'postgres:[^ ]*' "$ROOT/docker-compose.yml"), runner: $RUNNER, staged: $STAGED ($N_FILES)"
"${COMPOSE[@]}" up -d --wait db >/dev/null
psql_db -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

step "baseline: live migrations/*.sql + seed${AFTER:+ + staged prerequisites}"
for f in "$ROOT"/migrations/*.sql; do echo "apply $(basename "$f")"; psql_db < "$f"; done
# REPO-SPECIFIC: сид під легасі-схему 0001/0002; PII guard — лише Test Trip і детерміновані UUID.
psql_db <<'SQL'
INSERT INTO trips (id, title, country, starts_at, ends_at, status) VALUES
  ('00000000-0000-7000-8000-000000000001', 'Test Trip', 'PT', '2026-10-01', '2026-10-15', 'planned');
INSERT INTO expenses (id, trip_id, amount_minor, currency, category, spent_at) VALUES
  ('00000000-0000-7000-8000-00000000e001', '00000000-0000-7000-8000-000000000001', 1500, 'EUR',  'food',      '2026-10-02'),
  ('00000000-0000-7000-8000-00000000e002', '00000000-0000-7000-8000-000000000001', 4200, 'eur',  'transport', '2026-10-02'),
  ('00000000-0000-7000-8000-00000000e003', '00000000-0000-7000-8000-000000000001',  900, ' uah ', 'other',    '2026-10-03');
SQL
for d in "${AFTER[@]}"; do apply_prerequisite "$d"; done
catalog > "$OUT/0-baseline.catalog"; ids > "$OUT/0-baseline.ids"; data | tee "$OUT/0-baseline.data"

step "migrate up"
migrate up
expect_applied "$N_FILES"
catalog > "$OUT/1-up.catalog"; dump > "$OUT/1-up.dump"; data | tee "$OUT/1-up.data"

if [ -n "$PROBES" ]; then
  step "probes (each statement must FAIL on a CHECK)"
  n_probes=0
  while IFS= read -r line; do
    case "$line" in ''|--*) continue ;; esac
    stmt="${line%%-- expect:*}"; expect=""
    [ "$stmt" != "$line" ] && expect="$(echo "${line##*-- expect:}" | tr -d '[:space:]')"
    n_probes=$((n_probes + 1))
    if err="$(printf 'BEGIN;\n%s\nROLLBACK;\n' "$stmt" | psql_db 2>&1)"; then
      echo "FAIL accepted: $stmt"; touch "$OUT/probe-failed"
    elif ! echo "$err" | grep -q "violates check constraint \"${expect}"; then
      echo "FAIL wrong error (expected CHECK ${expect:-any}): $stmt"; echo "     $err" | head -2; touch "$OUT/probe-failed"
    else
      echo "OK   rejected by $(echo "$err" | grep -m1 -o 'check constraint "[^"]*"'): $stmt"
    fi
  done < "$(cd "$ROOT" && realpath "$PROBES")"
  echo "probes: $n_probes"
fi

step "migrate down (all staged)"
migrate down-all
expect_applied 0
catalog > "$OUT/2-down.catalog"; ids > "$OUT/2-down.ids"; data | tee "$OUT/2-down.data"

step "migrate up (again)"
migrate up
expect_applied "$N_FILES"
catalog > "$OUT/3-up.catalog"; dump > "$OUT/3-up.dump"; data > "$OUT/3-up.data"

step "compare"
ok=1
if diff -u "$OUT/0-baseline.catalog" "$OUT/2-down.catalog"; then echo "OK  down == baseline (columns, types, nullability, defaults, constraints, indexes)"; else ok=0; echo "FAIL down != baseline (catalog)"; fi
if diff -u "$OUT/0-baseline.ids" "$OUT/2-down.ids"; then echo "OK  down keeps every baseline row (PK set)"; else ok=0; echo "FAIL down lost or added rows"; fi
if diff -u "$OUT/1-up.dump" "$OUT/3-up.dump"; then echo "OK  up#2 == up#1 (pg_dump -s, byte-for-byte)"; else ok=0; echo "FAIL up#2 != up#1"; fi
if diff -u "$OUT/1-up.data" "$OUT/3-up.data"; then echo "OK  data after up#2 == after up#1"; else ok=0; echo "FAIL data drift between ups"; fi
[ -f "$OUT/probe-failed" ] && { ok=0; echo "FAIL a probe was accepted or failed for the wrong reason"; }
[ "$ok" = 1 ] && echo "ROUNDTRIP OK" || { echo "ROUNDTRIP FAILED"; exit 1; }
