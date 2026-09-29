#!/usr/bin/env bash
# Бінарний DoD для trip-budget T1 (Balance). exit 0 = готово, будь-що інше = ні.
# Його ганяє і агент (перед touch DONE), і scripts/ralph.sh (після DONE) — DONE на віру не приймаємо.
set -uo pipefail

BASE="${RALPH_BASE:-lesson-7.2-ralph}"
fail() { echo "FAIL: $*"; exit 1; }

[ -f src/shared/Balance.ts ] || fail "немає src/shared/Balance.ts"
[ -f src/shared/Balance.test.ts ] || fail "немає src/shared/Balance.test.ts"

git diff --quiet "$BASE" -- src/shared/Money.ts src/shared/Money.test.ts ralph/ CLAUDE.md docs/features/trip-budget/tasks/T1-balance-value-object.md \
  || fail "змінено захищені файли (Money.*, ralph/, CLAUDE.md або story T1): git diff $BASE -- <шлях>"

if grep -nE "from ['\"][^'\"]*(trips|expenses)/" src/shared/Balance.ts; then
  fail "shared/Balance.ts імпортує з BC trips/expenses (CLAUDE.md, dependency rule)"
fi

npx vitest run ralph/T1-balance src/shared > /tmp/ralph-t1-vitest.txt 2>&1 \
  || { tail -40 /tmp/ralph-t1-vitest.txt; fail "vitest: зонд або тести shared червоні"; }
npx vitest run > /tmp/ralph-t1-vitest-all.txt 2>&1 \
  || { tail -40 /tmp/ralph-t1-vitest-all.txt; fail "vitest: повний прогін червоний"; }
npx tsc --noEmit > /tmp/ralph-t1-tsc.txt 2>&1 \
  || { head -40 /tmp/ralph-t1-tsc.txt; fail "tsc --noEmit не чистий"; }

# tr -d '\r': з core.autocrlf=true worktree отримує tracker.md з CRLF, і `|$` без цього не матчиться.
tr -d '\r' < docs/features/trip-budget/tasks/tracker.md | grep -qE '^\| T1 \|.*\| review \|$' \
  || fail "T1 у docs/features/trip-budget/tasks/tracker.md не в статусі review"

[ -z "$(git status --porcelain -- src/shared docs/features/trip-budget/tasks/tracker.md)" ] \
  || fail "є незакомічені зміни в src/shared або tracker.md"
git log --format=%s "$BASE"..HEAD | grep -q '^feat(shared): T1' \
  || fail "немає коміту з префіксом 'feat(shared): T1' після $BASE"

echo "PASS: T1 Balance — DoD виконано"
