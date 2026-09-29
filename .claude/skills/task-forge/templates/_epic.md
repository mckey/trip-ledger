---
type: epic
project: trip-ledger
feature: <slug>
created: YYYY-MM-DD
stories_total: <N>
waves: <L>
feature_size: <XS|S|M — з sad.md>
depends_on_epics: [<інший slug, якщо є external_blocked_by>]
---

# Epic: <slug>

> [PRD](../PRD.md) · [SAD](../sad.md) · [data-model](../data-model.md) · [openapi](../contracts/openapi.yaml) · [ADR](../adr/) · [CONTEXT](../CONTEXT.md) · [tracker](./tracker.md) · [provenance](./_generation.md) · [tasks.json](./tasks.json)

## Проблема

<!-- 2–3 речення з PRD §1 своїми словами. -->

## Рішення

<!-- Approach з idea-brief + що саме v1 постачає; межа з сусідньою фічею. -->

## Progress

### Wave 1 — <назва> (<n> stories, parallel)

- [ ] [SHR-1 · <title>](./SHR-1-….md) — S — Must

### Wave 2 — …

## Dependencies

<!-- Формат прикладу курсу: рядки = хвилі (усередині — паралельно), `◄` — blocked_by; рядок `extern` — stories іншого епіку.
     Список звіряє з frontmatter гейт E9 — кожна story з блокерами має тут свій рядок «ID ◄ …». -->

```text
extern   trip-budget:T3 ► MIG-1

Wave 1   SHR-1 · MIG-1
Wave 2   EXP-1 ◄ SHR-1
Wave 3   EXP-2 ◄ EXP-1, MIG-1
```

Критичний шлях:

```text
SHR-1 ──► EXP-1 ──► EXP-2
```

## Ризики / Hard rules

<!-- NFR PRD §6, SAD §11, CLAUDE.md dependency rule, порядок промоції міграцій. -->

## Метрики

<!-- PRD §7 KPI + як дізнаємось, що епік «спрацював». -->
