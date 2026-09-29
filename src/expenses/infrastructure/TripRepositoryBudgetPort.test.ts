import { describe, expect, it } from 'vitest';
import { TripRepositoryBudgetPort } from './TripRepositoryBudgetPort';
import { InMemoryTripRepository } from '../../trips/infrastructure/InMemoryTripRepository';
import { aTrip } from '../../trips/testing/aTrip';
import { Money } from '../../shared/Money';

describe('TripRepositoryBudgetPort', () => {
  it('для поїздки без budget повертає null', async () => {
    const trips = new InMemoryTripRepository();
    await trips.save(aTrip());
    const port = new TripRepositoryBudgetPort(trips);

    expect(await port.budget('00000000-0000-7000-8000-000000000001')).toBeNull();
  });

  it('для поїздки з budget повертає Money у base currency', async () => {
    const trips = new InMemoryTripRepository();
    const budget = new Money(150_000, 'EUR');
    await trips.save(aTrip({ budget }));
    const port = new TripRepositoryBudgetPort(trips);

    const result = await port.budget('00000000-0000-7000-8000-000000000001');

    expect(result).not.toBeNull();
    expect(result?.amount).toEqual(budget);
    expect(result?.amount.currency).toBe('EUR');
  });

  it('для неіснуючої поїздки повертає null', async () => {
    const trips = new InMemoryTripRepository();
    const port = new TripRepositoryBudgetPort(trips);

    expect(await port.budget('does-not-exist')).toBeNull();
  });
});
