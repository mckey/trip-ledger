import { describe, expect, it } from 'vitest';
import { RatedExpensesPort, Trip } from '../domain/Trip';
import { BaseCurrencyLockedError, TripDoesNotExistError } from '../domain/errors';
import { InMemoryTripRepository } from '../infrastructure/InMemoryTripRepository';
import { aTrip } from '../testing/aTrip';
import { SetTripBaseCurrency } from './SetTripBaseCurrency';

function portReturning(value: boolean): RatedExpensesPort {
  return { hasRatedExpenses: async () => value };
}

const throwingPort: RatedExpensesPort = {
  hasRatedExpenses: async () => {
    throw new Error('port must not be asked');
  },
};

class SpyTripRepository extends InMemoryTripRepository {
  saves = 0;

  override async save(trip: Trip): Promise<void> {
    this.saves += 1;
    await super.save(trip);
  }
}

describe('SetTripBaseCurrency', () => {
  it('AC-t2-1: blocks changing base currency while rated expenses exist', async () => {
    const repo = new SpyTripRepository();
    const trip = aTrip({ baseCurrency: 'EUR' });
    await repo.save(trip);
    repo.saves = 0;

    await expect(
      new SetTripBaseCurrency(repo, portReturning(true)).execute(trip.id, 'PLN'),
    ).rejects.toThrow(BaseCurrencyLockedError);

    expect(repo.saves).toBe(0);
    expect((await repo.findById(trip.id))?.baseCurrency).toBe('EUR');
  });

  it('AC-t2-2: first assignment does not ask the port', async () => {
    const repo = new InMemoryTripRepository();
    const trip = aTrip();
    await repo.save(trip);

    await new SetTripBaseCurrency(repo, throwingPort).execute(trip.id, 'EUR');

    expect((await repo.findById(trip.id))?.baseCurrency).toBe('EUR');
  });

  it('AC-t2-4: throws TripDoesNotExistError for an unknown trip', async () => {
    const repo = new InMemoryTripRepository();

    await expect(
      new SetTripBaseCurrency(repo, portReturning(false)).execute('missing', 'EUR'),
    ).rejects.toThrow(TripDoesNotExistError);
  });
});
