#!/usr/bin/env bash
# Ralph loop для trip-ledger: канонічний цикл Хантлі (свіжий `claude -p` щоітерації)
# + запобіжники обв'язки. Урок 7.2.
#
#   scripts/ralph.sh ralph/T1-balance
#
# Каталог story містить PROMPT.md (три секції) і check.sh (бінарний DoD, exit 0 = готово).
# Запускати в ізольованому git worktree, не в основній робочій копії.
#
# Виходи: 0 — DONE і check.sh зелений; 1 — MAX_ITER або бюджет; 2 — BLOCKED.md або
# помилка конфігурації; 130 — Ctrl-C.

set -uo pipefail   # без -e: код виходу claude і check.sh обробляємо самі

STORY_DIR="${1:?usage: scripts/ralph.sh <ralph/story-dir>}"
PROMPT_FILE="$STORY_DIR/PROMPT.md"
CHECK="$STORY_DIR/check.sh"

MAX_ITER="${MAX_ITER:-5}"                # запобіжник 1: жорстка межа ітерацій
MAX_COST_USD="${MAX_COST_USD:-5}"        # запобіжник 2: межа на весь прогін
ITER_BUDGET_USD="${ITER_BUDGET_USD:-2}"  # і на одну ітерацію (--max-budget-usd)
MODEL="${MODEL:-sonnet}"
CLAUDE_BIN="${CLAUDE_BIN:-claude}"       # підміна на фейк для тесту самої обв'язки
COST_LOG="${COST_LOG:-ralph-cost.tsv}"   # тримати ПОЗА worktree, щоб агент не міг його правити
FEEDBACK=.ralph-feedback.txt

cd "$(git rev-parse --show-toplevel)" || exit 2
[ -f "$PROMPT_FILE" ] || { echo "немає $PROMPT_FILE" >&2; exit 2; }
[ -f "$CHECK" ] || { echo "немає $CHECK" >&2; exit 2; }

# Агенту дозволено рівно те, що потрібно для story; решта в режимі dontAsk відхиляється.
ALLOWED=(Read Edit Write Glob Grep
  "Bash(npx vitest run:*)" "Bash(npx tsc --noEmit)"
  "Bash(git status:*)" "Bash(git diff:*)" "Bash(git log:*)" "Bash(git add:*)" "Bash(git commit:*)"
  "Bash(bash $CHECK)" "Bash(touch DONE)")
DENIED=(WebFetch WebSearch "Bash(npm:*)" "Bash(git push:*)" "Bash(git reset:*)" "Bash(git checkout:*)" "Bash(rm:*)")

ITER=0
TOTAL=0

[ -f "$COST_LOG" ] || printf 'ts\titer\tcost_usd\ttotal_usd\tturns\tduration_s\tis_error\tdenials\tnote\n' > "$COST_LOG"
log() { printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' "$(date -Iseconds)" "$ITER" "${2:-}" "$TOTAL" "${3:-}" "${4:-}" "${5:-}" "${6:-}" "$1" >> "$COST_LOG"; }

# Запобіжник 3: Ctrl-C зупиняє весь цикл, а не лише поточний claude.
trap 'echo; echo "Ctrl-C на ітерації $ITER — зупиняюсь, стан у git status"; log interrupted; exit 130' INT TERM

log "start story=$STORY_DIR model=$MODEL max_iter=$MAX_ITER max_cost=$MAX_COST_USD"

while :; do
  if [ -f BLOCKED.md ]; then
    echo "Агент позначив story як BLOCKED:"; cat BLOCKED.md
    log blocked; exit 2
  fi

  # DONE — лише заявка. Обв'язка сама переганяє check.sh і знімає DONE, якщо він червоний.
  if [ -f DONE ]; then
    if bash "$CHECK" > "$FEEDBACK" 2>&1; then
      rm -f "$FEEDBACK"
      log "done after $ITER iter"
      echo "Ralph: DONE за $ITER ітерацій, ~\$$TOTAL. Дивись git log."
      exit 0
    fi
    echo "DONE є, але check.sh червоний — знімаю DONE, фідбек у $FEEDBACK"
    rm -f DONE
    log "false-done"
  fi

  ITER=$((ITER + 1))
  if [ "$ITER" -gt "$MAX_ITER" ]; then
    echo "Межа ітерацій ($MAX_ITER) — виходжу без DONE."
    log max-iter; exit 1
  fi
  if awk -v t="$TOTAL" -v m="$MAX_COST_USD" 'BEGIN { exit !(t >= m) }'; then
    echo "Бюджет прогону \$$MAX_COST_USD вичерпано (\$$TOTAL) — виходжу без DONE."
    log max-cost; exit 1
  fi

  echo "--- Ітерація $ITER (разом ~\$$TOTAL) ---"
  START=$(date +%s)
  # Холодний старт: новий процес, промпт через stdin, сесія не зберігається.
  # --setting-sources project,local: без user-налаштувань (мова, output style, плагіни) —
  # у першому прогоні агент успадкував Explanatory-стиль і палив токени на Insight-блоки.
  OUT=$("$CLAUDE_BIN" -p --output-format json --model "$MODEL" \
    --permission-mode dontAsk --max-budget-usd "$ITER_BUDGET_USD" --no-session-persistence \
    --setting-sources project,local \
    --allowedTools "${ALLOWED[@]}" --disallowedTools "${DENIED[@]}" < "$PROMPT_FILE")
  RC=$?
  DUR=$(( $(date +%s) - START ))
  # Повний JSON ітерації поруч з логом: без нього не видно, ЩО саме відхилив dontAsk.
  printf '%s' "$OUT" > "${COST_LOG%.tsv}.iter$ITER.json"

  read -r COST TURNS ERR DENIALS INFRA < <(printf '%s' "$OUT" | node -e '
    let s = ""; process.stdin.on("data", d => s += d).on("end", () => {
      try {
        const j = JSON.parse(s);
        const infra = j.terminal_reason === "api_error" ? 1 : 0;
        const denials = j.permission_denials || [];
        console.log([j.total_cost_usd ?? 0, j.num_turns ?? 0, j.is_error ? 1 : 0, denials.length, infra].join(" "));
        for (const d of denials) console.error("    denied: " + d.tool_name + " " + JSON.stringify(d.tool_input || {}).slice(0, 200));
        console.error((j.result || "").slice(-600));
      } catch { console.log("0 0 parse 0 1"); console.error(s.slice(-600)); }
    });')
  TOTAL=$(awk -v t="$TOTAL" -v c="$COST" 'BEGIN { printf "%.4f", t + c }')
  log "rc=$RC" "$COST" "$TURNS" "$DUR" "$ERR" "$DENIALS"
  echo "    rc=$RC cost=\$$COST turns=$TURNS ${DUR}s denials=$DENIALS"

  # Збій інфраструктури (auth, API, нечитабельний вивід) — не провал моделі:
  # не палимо на ньому решту ітерацій, а зупиняємось одразу.
  if [ "$INFRA" = 1 ]; then
    echo "Інфраструктурна помилка claude (auth/API) — зупиняюсь, ітерації не палю."
    log infra-error; exit 2
  fi

  sleep 1   # вікно для Ctrl-C між ітераціями
done
