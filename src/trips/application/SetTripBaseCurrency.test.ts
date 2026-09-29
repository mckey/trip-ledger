import { describe, expect, it } from 'vitest';
import { RatedExpensesPort, Trip, TripRepository } from '../domain/Trip';
import { BaseCurrencyLockedError, TripDoesNotExistError } from '../domain/errors';
import { aTrip } from '../testing/aTrip';
import { SetTripBaseCurrency } from './SetTripBaseCurrency';

class FakeTripRepository implements TripRepository {
  private trips = new Map<string, Trip>();
  saveCalls = 0;

  seed(trip: Trip): void {
    this.trips.set(trip.id, trip);
  }

  async save(trip: Trip): Promise<void> {
    this.saveCalls += 1;
    this.trips.set(trip.id, trip);
  }

  async findById(id: string): Promise<Trip | null> {
    return this.trips.get(id) ?? null;
  }

  async list(): Promise<Trip[]> {
    return [...this.trips.values()];
  }
}

describe('SetTripBaseCurrency', () => {
  it('AC-t2-1: blocks changing base currency while rated expenses exist', async () => {
    const repository = new FakeTripRepository();
    const trip = aTrip({ baseCurrency: 'EUR' });
    repository.seed(trip);
    const port: RatedExpensesPort = { hasRatedExpenses: async () => true };
    const useCase = new SetTripBaseCurrency(repository, port);

    await expect(useCase.execute(trip.id, 'PLN')).rejects.toThrow(BaseCurrencyLockedError);

    expect(repository.saveCalls).toBe(0);
    expect((await repository.findById(trip.id))?.baseCurrency).toBe('EUR');
  });

  it('AC-t2-2: first assignment saves the currency without asking the port', async () => {
    const repository = new FakeTripRepository();
    const trip = aTrip();
    repository.seed(trip);
    const port: RatedExpensesPort = {
      hasRatedExpenses: async () => {
        throw new Error('port must not be asked');
      },
    };
    const useCase = new SetTripBaseCurrency(repository, port);

    await useCase.execute(trip.id, 'EUR');

    expect((await repository.findById(trip.id))?.baseCurrency).toBe('EUR');
    expect(repository.saveCalls).toBe(1);
  });

  // Додано на --review-tests: без цих двох реалізація, що взагалі не питає порт, проходить AC-t2-1/2/4.
  it('edge (Checklist Step 1): changing a set currency without explicit rates asks the port and saves', async () => {
    const repository = new FakeTripRepository();
    const trip = aTrip({ baseCurrency: 'EUR' });
    repository.seed(trip);
    const asked: string[] = [];
    const port: RatedExpensesPort = {
      hasRatedExpenses: async (tripId) => {
        asked.push(tripId);
        return false;
      },
    };
    const useCase = new SetTripBaseCurrency(repository, port);

    await useCase.execute(trip.id, 'PLN');

    expect(asked).toEqual([trip.id]);
    expect((await repository.findById(trip.id))?.baseCurrency).toBe('PLN');
    expect(repository.saveCalls).toBe(1);
  });

  it('edge: the same currency again is a no-op without asking the port', async () => {
    const repository = new FakeTripRepository();
    const trip = aTrip({ baseCurrency: 'EUR' });
    repository.seed(trip);
    const port: RatedExpensesPort = {
      hasRatedExpenses: async () => {
        throw new Error('port must not be asked');
      },
    };
    const useCase = new SetTripBaseCurrency(repository, port);

    await useCase.execute(trip.id, 'EUR');

    expect((await repository.findById(trip.id))?.baseCurrency).toBe('EUR');
  });

  it('AC-t2-4: throws TripDoesNotExistError for an unknown trip', async () => {
    const repository = new FakeTripRepository();
    const port: RatedExpensesPort = { hasRatedExpenses: async () => false };
    const useCase = new SetTripBaseCurrency(repository, port);

    await expect(useCase.execute('missing', 'EUR')).rejects.toThrow(TripDoesNotExistError);
  });
});
