#!/usr/bin/env bash
# Збирає пакет для clean-reviewer: AC + Edge cases + DoD зі story-файлу і git diff HEAD.
# Нічого іншого в пакет не потрапляє — у цьому сенс чистого аркуша (урок 7.6).
#
#   scripts/review-packet.sh <story.md> <review-dir>
#   → <review-dir>/packet-N.md (N — наступний вільний номер), шлях друкується в stdout
set -euo pipefail

story="$1"; dir="$2"
mkdir -p "$dir"
n=1; while [ -e "$dir/packet-$n.md" ]; do n=$((n+1)); done
out="$dir/packet-$n.md"

# Секція markdown від "## <назва>" до наступного "## ".
section() { awk -v h="## $1" '$0==h{p=1;print;next} p&&/^## /{p=0} p' "$story"; }

{
  echo "# Review packet · $(basename "$story" .md) · packet-$n"
  echo
  echo "base: \`$(git rev-parse --short HEAD)\` · diff: \`git diff HEAD\` (незакомічені зміни)"
  echo "diff-sha256: \`$(scripts/critical-diff-hash.sh HEAD)\`"
  echo
  section "Acceptance criteria"; echo
  section "Edge cases"; echo
  section "Definition of Done"; echo
  echo "## Diff"
  echo
  echo '```diff'
  git --no-pager diff --no-color -U10 HEAD -- . ':(exclude)review/' ':(exclude)docs/'
  echo '```'
} > "$out"

echo "$out"
