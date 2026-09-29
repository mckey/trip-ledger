#!/usr/bin/env bash
# Сторож фонової сесії (урок 7.5): один оберт /loop = один рядок TSV-логу.
# Usage: scripts/bg-watchdog.sh <bg-id> <worktree> <base-sha> <log.tsv> [max-minutes]
# Жорсткої межі витрат у `claude --bg` немає (--max-budget-usd працює лише з --print),
# тож стелю часу тримає цей скрипт: довше max-minutes у стані working → claude stop.
set -u
ID="$1"; WT="$2"; BASE="$3"; LOG="$4"; MAX_MIN="${5:-20}"

# Вкладений claude з desktop-сесії падає на auth, поки в env лишаються CLAUDE*/ANTHROPIC*.
UNSET=$(env | grep -oE '^(CLAUDE|ANTHROPIC)[A-Z_]*' | sort -u | sed 's/^/-u /' | tr '\n' ' ')
cl() { env $UNSET claude "$@"; }

ROW=$(cl agents --json --all 2>/dev/null | node -e '
  let d = ""; process.stdin.on("data", c => d += c).on("end", () => {
    const s = JSON.parse(d).find(x => x.id === process.argv[1]);
    if (!s) { console.log("gone\t-\t-"); return; }
    console.log([s.status, s.state || "-", Math.round((Date.now() - s.startedAt) / 60000)].join("\t"));
  });' "$ID")
STATUS=$(cut -f1 <<<"$ROW"); AGE=$(cut -f3 <<<"$ROW")

COMMITS=$(git -C "$WT" rev-list --count "$BASE"..HEAD)
DIRTY=$(git -C "$WT" status --porcelain | wc -l)
ACTION="-"
if [ "$STATUS" = "busy" ] && [ "$AGE" != "-" ] && [ "$AGE" -ge "$MAX_MIN" ]; then
  cl stop "$ID" >/dev/null 2>&1 && ACTION="stopped:time-cap"
fi

[ -f "$LOG" ] || printf 'time\tstatus\tstate\tage_min\tcommits\tdirty\taction\n' > "$LOG"
printf '%s\t%s\t%s\t%s\t%s\n' "$(date +%H:%M:%S)" "$ROW" "$COMMITS" "$DIRTY" "$ACTION" >> "$LOG"
tail -1 "$LOG"
