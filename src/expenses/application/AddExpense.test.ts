import { describe, expect, it } from 'vitest';
import { AddExpense } from './AddExpense';
import { InMemoryExpenseRepository } from '../infrastructure/InMemoryExpenseRepository';
import { TripStatusPort } from '../domain/Expense';
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

describe('AddExpense', () => {
  it('persists an expense for a trip that accepts expenses', async () => {
    const repo = new InMemoryExpenseRepository();
    const useCase = new AddExpense(repo, new FakeTripStatusPort(true, true));

    const expense = await useCase.execute({
      tripId: 'trip-1',
      amount: new Money(1000, 'UAH'),
      category: 'food',
      spentAt: new Date('2026-09-02'),
    });

    expect(await repo.findByTrip('trip-1')).toEqual([expense]);
  });

  it('rejects an expense for a trip that does not accept expenses (domain invariant)', async () => {
    const repo = new InMemoryExpenseRepository();
    const useCase = new AddExpense(repo, new FakeTripStatusPort(true, false));

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
    const useCase = new AddExpense(repo, new FakeTripStatusPort(false, false));

    await expect(
      useCase.execute({
        tripId: 'missing',
        amount: new Money(1000, 'UAH'),
        category: 'food',
        spentAt: new Date('2026-09-02'),
      }),
    ).rejects.toThrow(TripNotFoundError);
  });
});
