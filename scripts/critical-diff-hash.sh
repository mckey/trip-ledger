#!/usr/bin/env bash
# sha256 diff-а по критичних шляхах (scripts/critical-paths.txt).
#   scripts/critical-diff-hash.sh HEAD      — незакомічені зміни (для пакета рецензента)
#   scripts/critical-diff-hash.sh --cached  — staged (для pre-commit)
# Порожній вивід = критичні шляхи не зачеплено.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

mapfile -t paths < <(tr -d '\r' < scripts/critical-paths.txt | grep -v '^\s*#' | grep -v '^\s*$')
diff=$(git --no-pager diff --no-color "$1" -- "${paths[@]}" | tr -d '\r')
[ -z "$diff" ] && exit 0
printf '%s' "$diff" | sha256sum | cut -c1-16
