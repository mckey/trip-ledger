---
id: T12
title: "Зшити TripBudgetPort у createApp і додати API-key та request-timing middleware"
layer: "wiring"
deps: ["T5", "T10", "T11"]
acs: ["AC-05", "AC-08"]
files_hint: ["src/presentation/app.ts", "src/presentation/server.ts", "src/presentation/apiKeyAuth.ts", "src/presentation/apiKeyAuth.test.ts", "src/presentation/requestTiming.ts", "src/trips/presentation/trips.http.test.ts", "src/expenses/presentation/expenses.http.test.ts"]
owner: "Vladimir Makarov"
estimate: "M"
status: "todo"
---

# T12 — Зшити TripBudgetPort у createApp і додати API-key та request-timing middleware

## Why

Композиція портів живе в `app.ts` ([sad §5](../sad.md)); межа доступу v1 — API-key middleware, що відмовляє **до** будь-якого читання сховища ([PRD §AC-08](../PRD.md), [sad §6](../sad.md) cross-cutting, [sad §8](../sad.md) «Access boundary»). Remaining рахується від budget саме цієї поїздки через порт ([PRD §AC-05](../PRD.md), [ADR-0002](../adr/0002-remaining-computed-in-expenses-via-trip-budget-port.md)). Request-timing — джерело p95 для [PRD §6](../PRD.md) / §7 ([sad §8](../sad.md) «Observability»).

## What

- `src/presentation/apiKeyAuth.ts` — middleware: немає ключа або не збігається → 401 `auth.unauthorized` без деталей і без звернення до репозиторіїв.
- `src/presentation/requestTiming.ts` — JSON-рядок `route`, `status`, `duration_ms` у `console`.
- `src/presentation/app.ts` — `createApp({ trips, expenses, apiKey })`: middleware першими; `TripRepositoryBudgetPort` у `expensesRouter` уже передає T6 — не дублювати.
- `src/presentation/server.ts` — читає `API_KEY` (відмова стартувати без нього), слухає `127.0.0.1`.
- `src/presentation/apiKeyAuth.test.ts`.

## Definition of Done

- [ ] `apiKeyAuth.test.ts` зелений: без ключа і з чужим ключем `PUT …/budget`, `GET …/summary` і `GET /trips/:id` → 401 з однаковим тілом для наявної і неіснуючої поїздки; репозиторій-шпигун не викликався (AC-08).
- [ ] З правильним ключем summary повертає блок budget, порахований від budget саме цієї поїздки (AC-05).
- [ ] `server.ts` без `API_KEY` завершується з помилкою, а не стартує відкритим.
- [ ] Наявні HTTP-тести T10/T11 зелені з ключем; `npx tsc --noEmit` чистий, `npx vitest run` зелений.

## Notes

- Код помилки і заголовок 401 — за контрактом після T0 (там F2 узгоджує `X-API-Key` / `http.unauthorized` з multi-currency-summary); назви вище — з поточного контракту до T0.
- Контракт задає `BearerAuth` (`Authorization: Bearer <API_KEY>`); SPEC.md говорить про «API-key в .env» — форма заголовка входить у рішення F2 ([api-sync-report](../contracts/api-sync-report.md)).
- Префікс `/api/v1` з `servers` контракту — теж частина F2: монтувати тут лише після рішення, бо він перенесе й наявні `/trips`-маршрути поза scope фічі.
- Rate-limit на заміну budget не вводиться — закрито як «без ліміту у v1» ([api-sync-report F5](../contracts/api-sync-report.md), [sad §11](../sad.md)).
- Додавання ключа ламає наявні HTTP-тести, що звуть `createApp` без нього, — їх оновлення входить у цю задачу (файли вже змінені T10/T11, які стоять у `deps`).
