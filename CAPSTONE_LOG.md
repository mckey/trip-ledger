# CAPSTONE_LOG — F1 vs F2

Метрики capstone M5: перша фіча руками, друга — через плагін trip-kit.

## F1 — Trips CRUD (руками, без плагіна)

- **Старт:** 2026-08-19 17:01:05 · **Зелений tsc+тести:** 17:04:48 · **Разом ≈ 4 хв чистої роботи агента** (без урахування формулювання промптів)
- **Vertical slice:** migrations/0001_create_trips.sql → domain (розширення TripRepository.list) → application (CreateTrip / GetTrip / ListTrips) → infrastructure (InMemory + Postgres) → presentation (zod + express router + app factory) → тести (unit + supertest HTTP)
- **Промпти, які повторював дослівно** (сирий матеріал для плагіна):
  1. «створи міграцію для сутності <X> за конвенціями node-pg-migrate»
  2. «створи use case <X> у application: залежності тільки через інтерфейси domain, один клас = одна дія»
  3. «додай InMemory- і Postgres-реалізації репозиторію <X>»
  4. «додай zod-схему і роути /<x> у presentation BC, HTTP-мапінг помилок 422/404»
  5. «напиши vitest-тести: unit на use case + supertest на роути, стаби in-memory»
  6. «прожени tsc --noEmit і vitest run, почини все червоне»
- **Перевірки руками:** npx tsc --noEmit, npx vitest run — двічі (перший прогін впіймав червоне)
- **Де зашпортнувся:**
  - інлайновий стаб у FinishTrip.test.ts не знав про новий метод list() інтерфейсу → tsc червоний, довелось повертатись (класика: розширив інтерфейс — онови ВСІ стаби)
  - роутер спершу ліг у src/presentation/ (composition root) замість src/trips/presentation/ — зловив сам при самоперевірці dependency rule, переніс
- **Підсумок F1:** 6 промптів, 2 повернення, 12/12 тестів зелені

## F2 — Expenses CRUD (через плагін trip-kit)

_(заповнюється на етапі 3)_

- Старт: · Зелені тести: · Разом:
- Промптів (команда плагіна = 1 промпт):
- Спрацювання hook'а:
- Де плагін НЕ допоміг:
