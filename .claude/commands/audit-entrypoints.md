Запусти збережений workflow `audit-entrypoints` (`.claude/workflows/audit-entrypoints.mjs`) — read-only аудит точок входу trip-ledger: HTTP-роути, use cases, репозиторії, адаптери-шви між BC.

1. Візьми поточний коміт: `git rev-parse --short HEAD`. Якщо робоче дерево брудне — попередь, що аудит іде по файлах на диску, а не по коміту.
2. Якщо з'явились нові роути / use cases / репозиторії, яких нема в `ITEMS` скрипта, — спершу допиши їх туди й покажи дифф, потім запускай.
3. Запусти Workflow з `name: "audit-entrypoints"` і `args: {"head": "<sha>"}`. $ARGUMENTS, якщо передано, — додатковий фокус для підсумку.
4. Після прогону: таблиця confirmed (severity, element, file:line, голоси), окремо — що відфільтрувала збіжність і чому, і `stats`. Нічого не виправляй — лише звіт.
