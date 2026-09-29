---
status: Draft
owner: "<автор фічі>"
reviewers: []
updated_at: "<YYYY-MM-DD>"
feature_size: <XS|S|M|L>
stage: "05"
ticket: "<ticket-id | ->"
---

# Events — <slug>

<!-- contract-forge: файл створюється лише якщо у sad.md §6 є async-учасник
(Worker / Scheduler / зовнішня система) або повідомлення `enqueue` / `publish`.
Sync-фіча — файлу немає, і api-sync-report.md так і пише. -->

## Source

- Flow: <sad.md §6 flow N — повідомлення `<A>->>Worker: enqueue …`>
- Transport: <in-process EventEmitter | outbox-таблиця + poller | черга>. Для single-process репо дефолт — outbox у тій самій транзакції, що й зміна агрегата.

## Event: `<bc>.<aggregate>.<past_tense_verb>.v<N>`

**Producer:** `<bc>` — use case `<UseCase>` (після commit).
**Consumers:** `<bc | script>` — <що робить>.
**Delivery:** at-least-once; споживач ідемпотентний по `eventId`.
**Ordering:** per `<aggregateId>` | none.

```json
{
  "eventId": "<uuid>",
  "type": "<bc>.<aggregate>.<verb>.v<N>",
  "occurredAt": "<ISO 8601 UTC>",
  "data": {
    "<aggregate>Id": "<uuid>",
    "<field>": "<тип; гроші — Money {amount, currency}, курс — рядок>"
  }
}
```

**Field origins:** `data.<field>` ← <колонка / VO / ADR>.
**Required:** `eventId`, `type`, `occurredAt`, `data.<aggregate>Id`.
**Compatibility:** additive-only; видалення / перейменування поля — нова `v<N+1>`, стара версія живе до міграції всіх споживачів.

## Retry / DLQ

- Retry: <N разів, backoff> — має збігатися з `Note over …: retry up to N` у flow.
- Poison: <outbox-рядок з `failed_at` + ручний replay | `<topic>.dlq`>.
- Replay: <команда / скрипт>.
