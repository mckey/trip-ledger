#!/usr/bin/env bash
# Збирає пакет для clean-reviewer: вимоги зі story-файлу + git diff від бази story.
# Нічого іншого в пакет не потрапляє — у цьому сенс чистого аркуша (урок 7.6).
#
#   scripts/review-packet.sh <story.md> <review-dir> [<base>] [-- <pathspec>...]
#     base      — коміт ДО початку story (не HEAD!): для доробки wip-story diff від HEAD
#                 показує лише дельту, і рецензент не бачить самої реалізації (SHR-1 packet-1).
#     pathspec  — що саме показати; за замовчуванням src/ і каталог tasks/ story.
#   → <review-dir>/packet-N.md, шлях друкується в stdout
set -euo pipefail

story="$1"; dir="$2"; base="${3:-HEAD}"
shift $(( $# < 3 ? $# : 3 ))
[ "${1:-}" = "--" ] && shift
if [ $# -gt 0 ]; then paths=("$@"); else paths=(src/ "$(dirname "$story")"); fi

mkdir -p "$dir"
n=1; while [ -e "$dir/packet-$n.md" ]; do n=$((n+1)); done
out="$dir/packet-$n.md"; tmp="$out.tmp"
trap 'rm -f "$tmp"' EXIT

# Секція markdown від "## <назва>…" (префікс: "## Acceptance criteria (GWT)") до наступного "## ".
section() { tr -d '\r' < "$story" | awk -v h="## $1" 'index($0,h)==1{p=1;print;next} p&&/^## /{p=0} p'; }

ac=$(section "Acceptance criteria"); dod=$(section "Definition of Done")
if [ -z "$ac$dod" ]; then
  echo "✗ у $story немає ні '## Acceptance criteria', ні '## Definition of Done' — рецензенту нема з чим звіряти" >&2
  exit 1
fi

{
  echo "# Review packet · $(basename "$story" .md) · packet-$n"
  echo
  echo "base: \`$(git rev-parse --short "$base")\` · diff: \`git diff $(git rev-parse --short "$base") -- ${paths[*]}\`"
  echo
  section "What"; echo
  printf '%s\n\n' "$ac"
  section "Edge cases"; echo
  printf '%s\n\n' "$dod"
  echo "## Diff"
  echo
  echo '```diff'
  git --no-pager diff --no-color -U10 "$base" -- "${paths[@]}" | tr -d '\r'
  echo '```'
} > "$tmp"
mv "$tmp" "$out"

echo "$out"
echo "diff-sha256 для pre-commit (після git add): scripts/critical-diff-hash.sh --cached" >&2
