# Review packet · T6-add-expense-and-summary-budget · packet-2

base: `739868d` · diff: `git diff 739868d -- src/ docs/features/trip-budget/tasks/tracker.md`

## What

- `src/expenses/application/AddExpense.ts` — отримує `TripBudgetPort`; після `save()` (завжди, незалежно від budget) рахує `BudgetBlock` і повертає `{ expense, budget: BudgetBlock | null }`.
- `src/expenses/application/GetTripSummary.ts` — отримує `TripBudgetPort`; повертає `{ lines, budget: BudgetBlock | null }`, `lines` рахуються як зараз.
- Оновити обидва `*.test.ts` під нову форму результату і додати AC-тести.





## Definition of Done

- [x] `AddExpense.test.ts`: `it('accepts an expense that exceeds the budget and returns overspend signal')` зелений — витрата збережена, `budget.overspend === true`, remaining від'ємний (AC-04, [sad §10 QG-3](../sad.md)); без budget → `budget: null`; наявні тести на 404/409-помилки зелені.
- [x] `GetTripSummary.test.ts`: remaining = budget − Σ counted (AC-03); від'ємний показується від'ємним (AC-03b); чужовалютні в `uncounted` (AC-06) і всі чужовалютні → remaining = повний budget (AC-06b); `it('replacing the budget does not touch stored expenses')` — після заміни budget витрати в репозиторії ідентичні, remaining від нового значення (AC-05, AC-07).
- [x] `npx vitest run src/expenses/application` зелений, `npx tsc --noEmit` чистий (HTTP-тести expenses — у DoD T11).

## Diff

```diff
diff --git a/docs/features/trip-budget/tasks/tracker.md b/docs/features/trip-budget/tasks/tracker.md
index 09df31f..38de641 100644
--- a/docs/features/trip-budget/tasks/tracker.md
+++ b/docs/features/trip-budget/tasks/tracker.md
@@ -4,20 +4,20 @@
 > States: `todo` · `in_progress` · `blocked` · `review` · `done`.
 
 | # | Task | Layer | Owner | Estimate | Blocked by | Status |
 |---|---|---|---|---|---|---|
 | T0 | [Узгодити контракт trip-budget з живим дротом: прогін contract-forge --update (F1/F2)](./T0-reconcile-contract-with-as-built-wire.md) | docs | Vladimir Makarov | M | — | review |
 | T1 | [Додати знаковий value object Balance у src/shared](./T1-balance-value-object.md) | domain | Vladimir Makarov | S | — | review |
 | T2 | [Додати budget, base currency і setBudget() у доменну сутність Trip](./T2-trip-budget-domain.md) | domain | Vladimir Makarov | M | — | review |
 | T3 | [Промотувати міграцію budget на trips і змапити колонки в PostgresTripRepository](./T3-budget-migration-trip-repository.md) | migration | Vladimir Makarov | M | T2 | todo |
 | T4 | [Додати use case SetTripBudget у BC trips](./T4-set-trip-budget-use-case.md) | app | Vladimir Makarov | S | T2 | review |
 | T5 | [Додати TripBudgetPort, чисту функцію BudgetBlock і адаптер TripRepositoryBudgetPort у BC expenses](./T5-budget-block-and-port.md) | app | Vladimir Makarov | M | T1, T2 | review |
-| T6 | [Повернути блок budget з AddExpense і GetTripSummary](./T6-add-expense-and-summary-budget.md) | app | Vladimir Makarov | M | T5 | todo |
+| T6 | [Повернути блок budget з AddExpense і GetTripSummary](./T6-add-expense-and-summary-budget.md) | app | Vladimir Makarov | M | T5 | review |
 | T7 | [Крок 1/3 currency_code: промотувати expand-міграцію і ввімкнути dual-write у PostgresExpenseRepository](./T7-currency-code-expand.md) | migration | Vladimir Makarov | M | T3 | todo |
 | T8 | [Крок 2/3 currency_code: промотувати backfill-міграцію і читати COALESCE(currency_code, currency)](./T8-currency-code-backfill.md) | migration | Vladimir Makarov | S | T7 | todo |
 | T9 | [Крок 3/3 currency_code: перевести PostgresExpenseRepository лише на currency_code і промотувати contract-міграцію](./T9-currency-code-contract.md) | migration | Vladimir Makarov | S | T8 | todo |
 | T10 | [Додати маршрут PUT /trips/{trip_id}/budget і презентер Trip у tripsRouter](./T10-put-trip-budget-endpoint.md) | ports | Vladimir Makarov | M | T0, T4 | todo |
 | T11 | [Перевести POST /trips/{trip_id}/expenses і GET /trips/{trip_id}/summary на форму контракту з блоком budget](./T11-expenses-endpoints-envelope.md) | ports | Vladimir Makarov | L | T6, T10 | todo |
 | T12 | [Зшити TripBudgetPort у createApp і додати API-key та request-timing middleware](./T12-app-wiring-api-key.md) | wiring | Vladimir Makarov | M | T5, T10, T11 | todo |
 | T13 | [Написати наскрізний HTTP-тест сценарію trip-budget з перевіркою латентності підсумку](./T13-e2e-trip-budget.md) | tests | Vladimir Makarov | M | T12 | todo |
 
 **Total:** 14 tasks, ~6.5 person-days (S = 2h × 4, M = half-day × 9, L = day × 1).
diff --git a/src/expenses/application/AddExpense.test.ts b/src/expenses/application/AddExpense.test.ts
index efd9eb6..f891c7a 100644
--- a/src/expenses/application/AddExpense.test.ts
+++ b/src/expenses/application/AddExpense.test.ts
@@ -1,65 +1,118 @@
 import { describe, expect, it } from 'vitest';
 import { AddExpense } from './AddExpense';
 import { InMemoryExpenseRepository } from '../infrastructure/InMemoryExpenseRepository';
-import { TripStatusPort } from '../domain/Expense';
+import { TripBudgetPort, TripStatusPort } from '../domain/Expense';
 import { Money } from '../../shared/Money';
 import { TripNotAcceptingExpensesError, TripNotFoundError } from '../domain/errors';
 
 class FakeTripStatusPort implements TripStatusPort {
   constructor(
     private readonly known: boolean,
     private readonly accepting: boolean,
   ) {}
 
   async exists(): Promise<boolean> {
     return this.known;
   }
 
   async canAcceptExpenses(): Promise<boolean> {
     return this.accepting;
   }
 }
 
+class FakeTripBudgetPort implements TripBudgetPort {
+  constructor(private readonly amount: Money | null) {}
+
+  async budget(): Promise<{ amount: Money } | null> {
+    return this.amount === null ? null : { amount: this.amount };
+  }
+}
+
 describe('AddExpense', () => {
   it('persists an expense for a trip that accepts expenses', async () => {
     const repo = new InMemoryExpenseRepository();
-    const useCase = new AddExpense(repo, new FakeTripStatusPort(true, true));
+    const useCase = new AddExpense(repo, new FakeTripStatusPort(true, true), new FakeTripBudgetPort(null));
 
-    const expense = await useCase.execute({
+    const { expense, budget } = await useCase.execute({
       tripId: 'trip-1',
       amount: new Money(1000, 'UAH'),
       category: 'food',
       spentAt: new Date('2026-09-02'),
     });
 
     expect(await repo.findByTrip('trip-1')).toEqual([expense]);
+    expect(budget).toBeNull();
   });
 
   it('rejects an expense for a trip that does not accept expenses (domain invariant)', async () => {
     const repo = new InMemoryExpenseRepository();
-    const useCase = new AddExpense(repo, new FakeTripStatusPort(true, false));
+    const useCase = new AddExpense(repo, new FakeTripStatusPort(true, false), new FakeTripBudgetPort(null));
 
     await expect(
       useCase.execute({
         tripId: 'trip-1',
         amount: new Money(1000, 'UAH'),
         category: 'food',
         spentAt: new Date('2026-09-02'),
       }),
     ).rejects.toThrow(TripNotAcceptingExpensesError);
   });
 
   it('rejects an expense for an unknown trip', async () => {
     const repo = new InMemoryExpenseRepository();
-    const useCase = new AddExpense(repo, new FakeTripStatusPort(false, false));
+    const useCase = new AddExpense(repo, new FakeTripStatusPort(false, false), new FakeTripBudgetPort(null));
 
     await expect(
       useCase.execute({
         tripId: 'missing',
         amount: new Money(1000, 'UAH'),
         category: 'food',
         spentAt: new Date('2026-09-02'),
       }),
     ).rejects.toThrow(TripNotFoundError);
   });
+
+  it('accepts an expense that exceeds the budget and returns overspend signal', async () => {
+    const repo = new InMemoryExpenseRepository();
+    const useCase = new AddExpense(
+      repo,
+      new FakeTripStatusPort(true, true),
+      new FakeTripBudgetPort(new Money(500, 'UAH')),
+    );
+
+    const { expense, budget } = await useCase.execute({
+      tripId: 'trip-1',
+      amount: new Money(1000, 'UAH'),
+      category: 'food',
+      spentAt: new Date('2026-09-02'),
+    });
+
+    // Витрата приймається завжди, навіть з перевищенням (sad §10 QG-3) — save() уже відбувся вище.
+    expect(await repo.findByTrip('trip-1')).toEqual([expense]);
+    expect(budget).not.toBeNull();
+    expect(budget?.overspend).toBe(true);
+    expect(budget?.remaining.amount).toBeLessThan(0);
+    expect(budget?.remaining.amount).toBe(-500);
+  });
+
+  it('a failing budget port leaves no expense stored (retry-safe)', async () => {
+    const repo = new InMemoryExpenseRepository();
+    const failingBudgetPort: TripBudgetPort = {
+      budget: () => Promise.reject(new Error('trips port unavailable')),
+    };
+    const useCase = new AddExpense(repo, new FakeTripStatusPort(true, true), failingBudgetPort);
+
+    await expect(
+      useCase.execute({
+        tripId: 'trip-1',
+        amount: new Money(1000, 'UAH'),
+        category: 'food',
+        spentAt: new Date('2026-09-02'),
+      }),
+    ).rejects.toThrow('trips port unavailable');
+
+    // Budget читається до save() (review F2) — падіння порту не лишає застряглу витрату,
+    // і клієнт може безпечно повторити POST без ризику дубля.
+    expect(await repo.findByTrip('trip-1')).toEqual([]);
+  });
 });
diff --git a/src/expenses/application/AddExpense.ts b/src/expenses/application/AddExpense.ts
index 5984d1e..ece2d8f 100644
--- a/src/expenses/application/AddExpense.ts
+++ b/src/expenses/application/AddExpense.ts
@@ -1,37 +1,57 @@
 import { randomUUID } from 'node:crypto';
-import { Expense, ExpenseCategory, ExpenseRepository, TripStatusPort } from '../domain/Expense';
+import { Expense, ExpenseCategory, ExpenseRepository, TripBudgetPort, TripStatusPort } from '../domain/Expense';
 import { Money } from '../../shared/Money';
 import { TripNotAcceptingExpensesError, TripNotFoundError } from '../domain/errors';
+import { BudgetBlock, BudgetBlockResult } from './BudgetBlock';
 
 export interface AddExpenseInput {
   tripId: string;
   amount: Money;
   category: ExpenseCategory;
   spentAt: Date;
 }
 
+export interface AddExpenseResult {
+  expense: Expense;
+  budget: BudgetBlockResult | null;
+}
+
 export class AddExpense {
   constructor(
     private readonly expenses: ExpenseRepository,
     private readonly tripStatus: TripStatusPort,
+    private readonly tripBudget: TripBudgetPort,
   ) {}
 
-  async execute(input: AddExpenseInput): Promise<Expense> {
+  async execute(input: AddExpenseInput): Promise<AddExpenseResult> {
     if (!(await this.tripStatus.exists(input.tripId))) {
       throw new TripNotFoundError(input.tripId);
     }
     if (!(await this.tripStatus.canAcceptExpenses(input.tripId))) {
       throw new TripNotAcceptingExpensesError(input.tripId);
     }
 
+    // Обидва читання — до save(): якщо порт budget або репозиторій кинуть тут, жодна витрата
+    // ще не збережена, і повтор запиту безпечний (review F2 — інакше падіння між save() і
+    // читанням budget лишало б витрату застряглою в репозиторії без повернутого budget-блоку,
+    // а ретрай клієнта створював би дублі).
+    const budget = await this.tripBudget.budget(input.tripId);
+    const existingExpenses = await this.expenses.findByTrip(input.tripId);
+
     const expense = new Expense(
       randomUUID(),
       input.tripId,
       input.amount,
       input.category,
       input.spentAt,
     );
     await this.expenses.save(expense);
-    return expense;
+
+    // Після save() лишається тільки чиста функція — BudgetBlock рахується завжди, незалежно
+    // від того, чи встановлено budget (ADR-0003), і не може впасти.
+    return {
+      expense,
+      budget: BudgetBlock(budget?.amount ?? null, [...existingExpenses, expense]),
+    };
   }
 }
diff --git a/src/expenses/application/GetTripSummary.test.ts b/src/expenses/application/GetTripSummary.test.ts
index 31165f0..b6ab66d 100644
--- a/src/expenses/application/GetTripSummary.test.ts
+++ b/src/expenses/application/GetTripSummary.test.ts
@@ -1,28 +1,154 @@
 import { describe, expect, it } from 'vitest';
 import { GetTripSummary } from './GetTripSummary';
 import { InMemoryExpenseRepository } from '../infrastructure/InMemoryExpenseRepository';
-import { Expense } from '../domain/Expense';
+import { Expense, TripBudgetPort } from '../domain/Expense';
 import { Money } from '../../shared/Money';
 
+class FakeTripBudgetPort implements TripBudgetPort {
+  constructor(private readonly amount: Money | null) {}
+
+  async budget(): Promise<{ amount: Money } | null> {
+    return this.amount === null ? null : { amount: this.amount };
+  }
+}
+
+/** Budget can be swapped between calls — simulates a real "budget replaced" scenario (review F1). */
+class MutableFakeTripBudgetPort implements TripBudgetPort {
+  amount: Money | null = null;
+
+  async budget(): Promise<{ amount: Money } | null> {
+    return this.amount === null ? null : { amount: this.amount };
+  }
+}
+
+/**
+ * Value-only snapshot, deliberately not the live Expense objects: InMemoryExpenseRepository
+ * .findByTrip() returns the same object references on every call (review F1), so comparing
+ * arrays by reference/toEqual against a re-fetched array is a tautology — it can never fail
+ * even if code mutated an Expense in place. Snapshotting primitives before any execute() call
+ * catches that.
+ */
+function snapshot(expenses: readonly Expense[]) {
+  return expenses.map((expense) => ({
+    id: expense.id,
+    tripId: expense.tripId,
+    amount: expense.amount.amount,
+    currency: expense.amount.currency,
+    category: expense.category,
+    spentAt: expense.spentAt.toISOString(),
+  }));
+}
+
 describe('GetTripSummary', () => {
   it('sums expenses per category and currency', async () => {
     const repo = new InMemoryExpenseRepository();
     await repo.save(new Expense('e1', 'trip-1', new Money(1000, 'UAH'), 'food', new Date('2026-09-01')));
     await repo.save(new Expense('e2', 'trip-1', new Money(500, 'UAH'), 'food', new Date('2026-09-02')));
     await repo.save(new Expense('e3', 'trip-1', new Money(2000, 'EUR'), 'lodging', new Date('2026-09-03')));
 
-    const summary = await new GetTripSummary(repo).execute('trip-1');
+    const { lines } = await new GetTripSummary(repo, new FakeTripBudgetPort(null)).execute('trip-1');
 
-    expect(summary).toEqual(
+    expect(lines).toEqual(
       expect.arrayContaining([
         { category: 'food', currency: 'UAH', total: new Money(1500, 'UAH') },
         { category: 'lodging', currency: 'EUR', total: new Money(2000, 'EUR') },
       ]),
     );
   });
 
   it('returns an empty summary for a trip with no expenses', async () => {
     const repo = new InMemoryExpenseRepository();
-    expect(await new GetTripSummary(repo).execute('trip-1')).toEqual([]);
+    const { lines, budget } = await new GetTripSummary(repo, new FakeTripBudgetPort(null)).execute('trip-1');
+    expect(lines).toEqual([]);
+    expect(budget).toBeNull();
+  });
+
+  it('remaining = budget − Σ counted (AC-03)', async () => {
+    const repo = new InMemoryExpenseRepository();
+    await repo.save(new Expense('e1', 'trip-1', new Money(3000, 'EUR'), 'food', new Date('2026-09-01')));
+    await repo.save(new Expense('e2', 'trip-1', new Money(2000, 'EUR'), 'lodging', new Date('2026-09-02')));
+
+    const { budget } = await new GetTripSummary(repo, new FakeTripBudgetPort(new Money(10_000, 'EUR'))).execute(
+      'trip-1',
+    );
+
+    expect(budget).not.toBeNull();
+    expect(budget?.remaining.amount).toBe(5000);
+    expect(budget?.remaining.currency).toBe('EUR');
+    expect(budget?.overspend).toBe(false);
+  });
+
+  it('від’ємний remaining показується від’ємним (AC-03b)', async () => {
+    const repo = new InMemoryExpenseRepository();
+    await repo.save(new Expense('e1', 'trip-1', new Money(7000, 'EUR'), 'food', new Date('2026-09-01')));
+    await repo.save(new Expense('e2', 'trip-1', new Money(5000, 'EUR'), 'lodging', new Date('2026-09-02')));
+
+    const { budget } = await new GetTripSummary(repo, new FakeTripBudgetPort(new Money(10_000, 'EUR'))).execute(
+      'trip-1',
+    );
+
+    expect(budget?.remaining.amount).toBe(-2000);
+    expect(budget?.remaining.isNegative()).toBe(true);
+    expect(budget?.overspend).toBe(true);
+  });
+
+  it('чужовалютні витрати йдуть у uncounted, не в Σ (AC-06)', async () => {
+    const repo = new InMemoryExpenseRepository();
+    await repo.save(new Expense('e1', 'trip-1', new Money(3000, 'EUR'), 'food', new Date('2026-09-01')));
+    await repo.save(new Expense('e2', 'trip-1', new Money(500_000, 'UAH'), 'lodging', new Date('2026-09-02')));
+
+    const { budget } = await new GetTripSummary(repo, new FakeTripBudgetPort(new Money(10_000, 'EUR'))).execute(
+      'trip-1',
+    );
+
+    expect(budget?.counted).toBe(1);
+    expect(budget?.uncounted).toBe(1);
+    expect(budget?.remaining.amount).toBe(7000);
+  });
+
+  it('усі чужовалютні витрати → remaining = повний budget (AC-06b)', async () => {
+    const repo = new InMemoryExpenseRepository();
+    await repo.save(new Expense('e1', 'trip-1', new Money(500_000, 'UAH'), 'food', new Date('2026-09-01')));
+    await repo.save(new Expense('e2', 'trip-1', new Money(50, 'USD'), 'lodging', new Date('2026-09-02')));
+
+    const budgetAmount = new Money(10_000, 'EUR');
+    const { budget } = await new GetTripSummary(repo, new FakeTripBudgetPort(budgetAmount)).execute('trip-1');
+
+    expect(budget?.counted).toBe(0);
+    expect(budget?.uncounted).toBe(2);
+    expect(budget?.remaining.amount).toBe(budgetAmount.amount);
+    expect(budget?.remaining.currency).toBe(budgetAmount.currency);
+    expect(budget?.overspend).toBe(false);
+  });
+
+  it('replacing the budget does not touch stored expenses', async () => {
+    const repo = new InMemoryExpenseRepository();
+    await repo.save(new Expense('e1', 'trip-1', new Money(3000, 'EUR'), 'food', new Date('2026-09-01')));
+    await repo.save(new Expense('e2', 'trip-1', new Money(2000, 'EUR'), 'lodging', new Date('2026-09-02')));
+
+    // Один інстанс GetTripSummary + мутабельний фейк-порт, budget якого міняється між
+    // викликами, — так тест реально відтворює «owner замінив budget», а не порівнює два
+    // незалежні прогони (review F1).
+    const budgetPort = new MutableFakeTripBudgetPort();
+    const summary = new GetTripSummary(repo, budgetPort);
+
+    const before = snapshot(await repo.findByTrip('trip-1'));
+
+    budgetPort.amount = new Money(10_000, 'EUR');
+    const firstResult = await summary.execute('trip-1');
+
+    budgetPort.amount = new Money(4000, 'EUR');
+    const secondResult = await summary.execute('trip-1');
+
+    const after = snapshot(await repo.findByTrip('trip-1'));
+
+    // AC-05: заміна budget не мутує жодну витрату — порівнюємо значеннєві знімки, зняті ДО
+    // першого execute(), а не самі об'єкти Expense (ті самі references — toEqual на них
+    // ніколи б не впав, навіть якби мутація сталась, review F1).
+    expect(after).toEqual(before);
+    // AC-07: remaining перераховується від нового значення budget.
+    expect(firstResult.budget?.remaining.amount).toBe(5000);
+    expect(secondResult.budget?.remaining.amount).toBe(-1000);
+    expect(secondResult.budget?.overspend).toBe(true);
   });
 });
diff --git a/src/expenses/application/GetTripSummary.ts b/src/expenses/application/GetTripSummary.ts
index ab59aa2..b3e7e88 100644
--- a/src/expenses/application/GetTripSummary.ts
+++ b/src/expenses/application/GetTripSummary.ts
@@ -1,28 +1,44 @@
-import { ExpenseCategory, ExpenseRepository } from '../domain/Expense';
+import { ExpenseCategory, ExpenseRepository, TripBudgetPort } from '../domain/Expense';
 import { Money } from '../../shared/Money';
+import { BudgetBlock, BudgetBlockResult } from './BudgetBlock';
 
 export interface TripSummaryLine {
   category: ExpenseCategory;
   currency: string;
   total: Money;
 }
 
+export interface TripSummaryResult {
+  lines: TripSummaryLine[];
+  budget: BudgetBlockResult | null;
+}
+
 export class GetTripSummary {
-  constructor(private readonly expenses: ExpenseRepository) {}
+  constructor(
+    private readonly expenses: ExpenseRepository,
+    private readonly tripBudget: TripBudgetPort,
+  ) {}
 
-  async execute(tripId: string): Promise<TripSummaryLine[]> {
+  async execute(tripId: string): Promise<TripSummaryResult> {
     const expenses = await this.expenses.findByTrip(tripId);
 
     const totals = new Map<string, Money>();
     for (const expense of expenses) {
       const key = `${expense.category}:${expense.amount.currency}`;
       const running = totals.get(key);
       totals.set(key, running ? running.add(expense.amount) : expense.amount);
     }
 
-    return [...totals.entries()].map(([key, total]) => {
+    const lines = [...totals.entries()].map(([key, total]) => {
       const [category, currency] = key.split(':') as [ExpenseCategory, string];
       return { category, currency, total };
     });
+
+    const budget = await this.tripBudget.budget(tripId);
+
+    return {
+      lines,
+      budget: BudgetBlock(budget?.amount ?? null, expenses),
+    };
   }
 }
diff --git a/src/expenses/presentation/expensesRouter.ts b/src/expenses/presentation/expensesRouter.ts
index 30ec264..6a7ff79 100644
--- a/src/expenses/presentation/expensesRouter.ts
+++ b/src/expenses/presentation/expensesRouter.ts
@@ -1,57 +1,65 @@
 import { Router } from 'express';
 import { z } from 'zod';
-import { ExpenseRepository, TripStatusPort } from '../domain/Expense';
+import { ExpenseRepository, TripBudgetPort, TripStatusPort } from '../domain/Expense';
 import { AddExpense } from '../application/AddExpense';
 import { ListExpenses } from '../application/ListExpenses';
 import { GetTripSummary } from '../application/GetTripSummary';
 import { Money } from '../../shared/Money';
 import { TripNotAcceptingExpensesError, TripNotFoundError } from '../domain/errors';
 
 const addExpenseSchema = z.object({
   amount: z.number().int().nonnegative(),
   currency: z.string().min(1),
   category: z.enum(['transport', 'lodging', 'food', 'tickets', 'other']),
   spentAt: z.coerce.date(),
 });
 
-export function expensesRouter(expenses: ExpenseRepository, tripStatus: TripStatusPort): Router {
+// tripBudget — новий параметр (T6, ADR-0002/0003). AddExpense/GetTripSummary тепер
+// повертають envelope { expense|lines, budget }, але маршрути й форма HTTP-відповіді
+// тут навмисно НЕ змінюються — presentation переходить на envelope в T11.
+export function expensesRouter(
+  expenses: ExpenseRepository,
+  tripStatus: TripStatusPort,
+  tripBudget: TripBudgetPort,
+): Router {
   const router = Router();
-  const addExpense = new AddExpense(expenses, tripStatus);
+  const addExpense = new AddExpense(expenses, tripStatus, tripBudget);
   const listExpenses = new ListExpenses(expenses);
-  const getTripSummary = new GetTripSummary(expenses);
+  const getTripSummary = new GetTripSummary(expenses, tripBudget);
 
   router.post('/trips/:id/expenses', async (req, res) => {
     const parsed = addExpenseSchema.safeParse(req.body);
     if (!parsed.success) {
       return res.status(422).json({ errors: parsed.error.issues });
     }
 
     try {
-      const expense = await addExpense.execute({
+      const result = await addExpense.execute({
         tripId: req.params.id,
         amount: new Money(parsed.data.amount, parsed.data.currency),
         category: parsed.data.category,
         spentAt: parsed.data.spentAt,
       });
-      return res.status(201).json(expense);
+      return res.status(201).json(result.expense);
     } catch (err) {
       if (err instanceof TripNotFoundError) {
         return res.status(404).json({ error: err.message });
       }
       if (err instanceof TripNotAcceptingExpensesError) {
         return res.status(409).json({ error: err.message });
       }
       throw err;
     }
   });
 
   router.get('/trips/:id/expenses', async (req, res) => {
     return res.json(await listExpenses.execute(req.params.id));
   });
 
   router.get('/trips/:id/summary', async (req, res) => {
-    return res.json(await getTripSummary.execute(req.params.id));
+    const result = await getTripSummary.execute(req.params.id);
+    return res.json(result.lines);
   });
 
   return router;
 }
diff --git a/src/presentation/app.ts b/src/presentation/app.ts
index fb4087b..23faf73 100644
--- a/src/presentation/app.ts
+++ b/src/presentation/app.ts
@@ -1,15 +1,18 @@
 import express, { Express } from 'express';
 import { TripRepository } from '../trips/domain/Trip';
 import { tripsRouter } from '../trips/presentation/tripsRouter';
 import { ExpenseRepository } from '../expenses/domain/Expense';
 import { expensesRouter } from '../expenses/presentation/expensesRouter';
 import { TripRepositoryStatusPort } from '../expenses/infrastructure/TripRepositoryStatusPort';
+import { TripRepositoryBudgetPort } from '../expenses/infrastructure/TripRepositoryBudgetPort';
 
 /** App factory — repositories injected so tests can pass in-memory doubles. */
 export function createApp(deps: { trips: TripRepository; expenses: ExpenseRepository }): Express {
   const app = express();
   app.use(express.json());
   app.use(tripsRouter(deps.trips));
-  app.use(expensesRouter(deps.expenses, new TripRepositoryStatusPort(deps.trips)));
+  app.use(
+    expensesRouter(deps.expenses, new TripRepositoryStatusPort(deps.trips), new TripRepositoryBudgetPort(deps.trips)),
+  );
   return app;
 }
```
