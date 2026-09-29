import { describe, expect, it } from 'vitest';
import { AddExpense } from './AddExpense';
import { InMemoryExpenseRepository } from '../infrastructure/InMemoryExpenseRepository';
import { TripBudgetPort, TripStatusPort } from '../domain/Expense';
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

class FakeTripBudgetPort implements TripBudgetPort {
  constructor(private readonly amount: Money | null) {}

  async budget(): Promise<{ amount: Money } | null> {
    return this.amount === null ? null : { amount: this.amount };
  }
}

describe('AddExpense', () => {
  it('persists an expense for a trip that accepts expenses', async () => {
    const repo = new InMemoryExpenseRepository();
    const useCase = new AddExpense(repo, new FakeTripStatusPort(true, true), new FakeTripBudgetPort(null));

    const { expense, budget } = await useCase.execute({
      tripId: 'trip-1',
      amount: new Money(1000, 'UAH'),
      category: 'food',
      spentAt: new Date('2026-09-02'),
    });

    expect(await repo.findByTrip('trip-1')).toEqual([expense]);
    expect(budget).toBeNull();
  });

  it('rejects an expense for a trip that does not accept expenses (domain invariant)', async () => {
    const repo = new InMemoryExpenseRepository();
    const useCase = new AddExpense(repo, new FakeTripStatusPort(true, false), new FakeTripBudgetPort(null));

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
    const useCase = new AddExpense(repo, new FakeTripStatusPort(false, false), new FakeTripBudgetPort(null));

    await expect(
      useCase.execute({
        tripId: 'missing',
        amount: new Money(1000, 'UAH'),
        category: 'food',
        spentAt: new Date('2026-09-02'),
      }),
    ).rejects.toThrow(TripNotFoundError);
  });

  it('accepts an expense that exceeds the budget and returns overspend signal', async () => {
    const repo = new InMemoryExpenseRepository();
    const useCase = new AddExpense(
      repo,
      new FakeTripStatusPort(true, true),
      new FakeTripBudgetPort(new Money(500, 'UAH')),
    );

    const { expense, budget } = await useCase.execute({
      tripId: 'trip-1',
      amount: new Money(1000, 'UAH'),
      category: 'food',
      spentAt: new Date('2026-09-02'),
    });

    // Витрата приймається завжди, навіть з перевищенням (sad §10 QG-3) — save() уже відбувся вище.
    expect(await repo.findByTrip('trip-1')).toEqual([expense]);
    expect(budget).not.toBeNull();
    expect(budget?.overspend).toBe(true);
    expect(budget?.remaining.amount).toBeLessThan(0);
    expect(budget?.remaining.amount).toBe(-500);
  });

  it('a failing budget port leaves no expense stored (retry-safe)', async () => {
    const repo = new InMemoryExpenseRepository();
    const failingBudgetPort: TripBudgetPort = {
      budget: () => Promise.reject(new Error('trips port unavailable')),
    };
    const useCase = new AddExpense(repo, new FakeTripStatusPort(true, true), failingBudgetPort);

    await expect(
      useCase.execute({
        tripId: 'trip-1',
        amount: new Money(1000, 'UAH'),
        category: 'food',
        spentAt: new Date('2026-09-02'),
      }),
    ).rejects.toThrow('trips port unavailable');

    // Budget читається до save() (review F2) — падіння порту не лишає застряглу витрату,
    // і клієнт може безпечно повторити POST без ризику дубля.
    expect(await repo.findByTrip('trip-1')).toEqual([]);
  });
});
