import { describe, expect, it } from 'vitest';
import { GetTripSummary } from './GetTripSummary';
import { InMemoryExpenseRepository } from '../infrastructure/InMemoryExpenseRepository';
import { Expense } from '../domain/Expense';
import { Money } from '../../shared/Money';

describe('GetTripSummary', () => {
  it('sums expenses per category and currency', async () => {
    const repo = new InMemoryExpenseRepository();
    await repo.save(new Expense('e1', 'trip-1', new Money(1000, 'UAH'), 'food', new Date('2026-09-01')));
    await repo.save(new Expense('e2', 'trip-1', new Money(500, 'UAH'), 'food', new Date('2026-09-02')));
    await repo.save(new Expense('e3', 'trip-1', new Money(2000, 'EUR'), 'lodging', new Date('2026-09-03')));

    const summary = await new GetTripSummary(repo).execute('trip-1');

    expect(summary).toEqual(
      expect.arrayContaining([
        { category: 'food', currency: 'UAH', total: new Money(1500, 'UAH') },
        { category: 'lodging', currency: 'EUR', total: new Money(2000, 'EUR') },
      ]),
    );
  });

  it('returns an empty summary for a trip with no expenses', async () => {
    const repo = new InMemoryExpenseRepository();
    expect(await new GetTripSummary(repo).execute('trip-1')).toEqual([]);
  });
});
