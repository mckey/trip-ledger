import { describe, expect, it } from 'vitest';
import { GetTripSummary } from './GetTripSummary';
import { InMemoryExpenseRepository } from '../infrastructure/InMemoryExpenseRepository';
import { Expense, TripBudgetPort } from '../domain/Expense';
import { Money } from '../../shared/Money';

class FakeTripBudgetPort implements TripBudgetPort {
  constructor(private readonly amount: Money | null) {}

  async budget(): Promise<{ amount: Money } | null> {
    return this.amount === null ? null : { amount: this.amount };
  }
}

/** Budget can be swapped between calls — simulates a real "budget replaced" scenario (review F1). */
class MutableFakeTripBudgetPort implements TripBudgetPort {
  amount: Money | null = null;

  async budget(): Promise<{ amount: Money } | null> {
    return this.amount === null ? null : { amount: this.amount };
  }
}

/**
 * Value-only snapshot, deliberately not the live Expense objects: InMemoryExpenseRepository
 * .findByTrip() returns the same object references on every call (review F1), so comparing
 * arrays by reference/toEqual against a re-fetched array is a tautology — it can never fail
 * even if code mutated an Expense in place. Snapshotting primitives before any execute() call
 * catches that.
 */
function snapshot(expenses: readonly Expense[]) {
  return expenses.map((expense) => ({
    id: expense.id,
    tripId: expense.tripId,
    amount: expense.amount.amount,
    currency: expense.amount.currency,
    category: expense.category,
    spentAt: expense.spentAt.toISOString(),
  }));
}

describe('GetTripSummary', () => {
  it('sums expenses per category and currency', async () => {
    const repo = new InMemoryExpenseRepository();
    await repo.save(new Expense('e1', 'trip-1', new Money(1000, 'UAH'), 'food', new Date('2026-09-01')));
    await repo.save(new Expense('e2', 'trip-1', new Money(500, 'UAH'), 'food', new Date('2026-09-02')));
    await repo.save(new Expense('e3', 'trip-1', new Money(2000, 'EUR'), 'lodging', new Date('2026-09-03')));

    const { lines } = await new GetTripSummary(repo, new FakeTripBudgetPort(null)).execute('trip-1');

    expect(lines).toEqual(
      expect.arrayContaining([
        { category: 'food', currency: 'UAH', total: new Money(1500, 'UAH') },
        { category: 'lodging', currency: 'EUR', total: new Money(2000, 'EUR') },
      ]),
    );
  });

  it('returns an empty summary for a trip with no expenses', async () => {
    const repo = new InMemoryExpenseRepository();
    const { lines, budget } = await new GetTripSummary(repo, new FakeTripBudgetPort(null)).execute('trip-1');
    expect(lines).toEqual([]);
    expect(budget).toBeNull();
  });

  it('remaining = budget − Σ counted (AC-03)', async () => {
    const repo = new InMemoryExpenseRepository();
    await repo.save(new Expense('e1', 'trip-1', new Money(3000, 'EUR'), 'food', new Date('2026-09-01')));
    await repo.save(new Expense('e2', 'trip-1', new Money(2000, 'EUR'), 'lodging', new Date('2026-09-02')));

    const { budget } = await new GetTripSummary(repo, new FakeTripBudgetPort(new Money(10_000, 'EUR'))).execute(
      'trip-1',
    );

    expect(budget).not.toBeNull();
    expect(budget?.remaining.amount).toBe(5000);
    expect(budget?.remaining.currency).toBe('EUR');
    expect(budget?.overspend).toBe(false);
  });

  it('від’ємний remaining показується від’ємним (AC-03b)', async () => {
    const repo = new InMemoryExpenseRepository();
    await repo.save(new Expense('e1', 'trip-1', new Money(7000, 'EUR'), 'food', new Date('2026-09-01')));
    await repo.save(new Expense('e2', 'trip-1', new Money(5000, 'EUR'), 'lodging', new Date('2026-09-02')));

    const { budget } = await new GetTripSummary(repo, new FakeTripBudgetPort(new Money(10_000, 'EUR'))).execute(
      'trip-1',
    );

    expect(budget?.remaining.amount).toBe(-2000);
    expect(budget?.remaining.isNegative()).toBe(true);
    expect(budget?.overspend).toBe(true);
  });

  it('чужовалютні витрати йдуть у uncounted, не в Σ (AC-06)', async () => {
    const repo = new InMemoryExpenseRepository();
    await repo.save(new Expense('e1', 'trip-1', new Money(3000, 'EUR'), 'food', new Date('2026-09-01')));
    await repo.save(new Expense('e2', 'trip-1', new Money(500_000, 'UAH'), 'lodging', new Date('2026-09-02')));

    const { budget } = await new GetTripSummary(repo, new FakeTripBudgetPort(new Money(10_000, 'EUR'))).execute(
      'trip-1',
    );

    expect(budget?.counted).toBe(1);
    expect(budget?.uncounted).toBe(1);
    expect(budget?.remaining.amount).toBe(7000);
  });

  it('усі чужовалютні витрати → remaining = повний budget (AC-06b)', async () => {
    const repo = new InMemoryExpenseRepository();
    await repo.save(new Expense('e1', 'trip-1', new Money(500_000, 'UAH'), 'food', new Date('2026-09-01')));
    await repo.save(new Expense('e2', 'trip-1', new Money(50, 'USD'), 'lodging', new Date('2026-09-02')));

    const budgetAmount = new Money(10_000, 'EUR');
    const { budget } = await new GetTripSummary(repo, new FakeTripBudgetPort(budgetAmount)).execute('trip-1');

    expect(budget?.counted).toBe(0);
    expect(budget?.uncounted).toBe(2);
    expect(budget?.remaining.amount).toBe(budgetAmount.amount);
    expect(budget?.remaining.currency).toBe(budgetAmount.currency);
    expect(budget?.overspend).toBe(false);
  });

  it('replacing the budget does not touch stored expenses', async () => {
    const repo = new InMemoryExpenseRepository();
    await repo.save(new Expense('e1', 'trip-1', new Money(3000, 'EUR'), 'food', new Date('2026-09-01')));
    await repo.save(new Expense('e2', 'trip-1', new Money(2000, 'EUR'), 'lodging', new Date('2026-09-02')));

    // Один інстанс GetTripSummary + мутабельний фейк-порт, budget якого міняється між
    // викликами, — так тест реально відтворює «owner замінив budget», а не порівнює два
    // незалежні прогони (review F1).
    const budgetPort = new MutableFakeTripBudgetPort();
    const summary = new GetTripSummary(repo, budgetPort);

    const before = snapshot(await repo.findByTrip('trip-1'));

    budgetPort.amount = new Money(10_000, 'EUR');
    const firstResult = await summary.execute('trip-1');

    budgetPort.amount = new Money(4000, 'EUR');
    const secondResult = await summary.execute('trip-1');

    const after = snapshot(await repo.findByTrip('trip-1'));

    // AC-05: заміна budget не мутує жодну витрату — порівнюємо значеннєві знімки, зняті ДО
    // першого execute(), а не самі об'єкти Expense (ті самі references — toEqual на них
    // ніколи б не впав, навіть якби мутація сталась, review F1).
    expect(after).toEqual(before);
    // AC-07: remaining перераховується від нового значення budget.
    expect(firstResult.budget?.remaining.amount).toBe(5000);
    expect(secondResult.budget?.remaining.amount).toBe(-1000);
    expect(secondResult.budget?.overspend).toBe(true);
  });
});
