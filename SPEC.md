# SPEC — trip-ledger

## Goals

- REST API: CRUD поїздок (trip: назва, країна, дати, статус planned/active/finished).
- Облік витрат у поїздці (expense: сума, валюта, категорія, дата) з підсумком по поїздці.
- Підсумкова статистика: сума витрат по поїздці та по категоріях.

## Non-goals

- Немає користувачів/авторизації в v1 (один власник, API-key в .env).
- Немає конвертації валют — сума зберігається в валюті введення.
- Немає UI — тільки JSON API.
- Немає шарингу поїздок і мультитенантності.

## Technical decisions

- TypeScript + Node.js 22, Express 5 — стек, який я знаю, швидкий старт.
- Clean Architecture: бізнес-правила (статуси поїздки, заборона витрат у finished-поїздці) ізольовані від фреймворка.
- PostgreSQL через `pg` без ORM — див. docs/adr/0001.
- Два BC: `trips` і `expenses` — зв'язок тільки по `tripId`.

## Acceptance criteria

- `POST /trips` створює поїздку, невалідні дати (end < start) → 422.
- `POST /trips/:id/expenses` додає витрату; у поїздку зі статусом `finished` → 409.
- `GET /trips/:id/summary` повертає суму витрат по категоріях.
- Domain-шар тестується без БД і без Express (чисті юніт-тести).
- `make dev`, `make test`, `make lint` працюють одразу після `npm i` + `.env` з `.env.example`.
