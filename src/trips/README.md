# BC: trips

Життєвий цикл поїздки: створення, дати, статуси `planned -> active -> finished`.

- `domain/` — сутність `Trip`, `TripStatus`, інтерфейс `TripRepository`. Чистий TS.
- `application/` — use cases: `CreateTrip`, `FinishTrip`, `GetTrip`.
- `infrastructure/` — `PostgresTripRepository`.
- `presentation/` — роути `/trips`, zod-схеми.

Не знає про BC `expenses`.
