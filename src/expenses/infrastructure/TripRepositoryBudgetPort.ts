import { TripRepository } from '../../trips/domain/Trip';
import { TripBudgetPort } from '../domain/Expense';
import { Money } from '../../shared/Money';

/** Адаптер порту expenses поверх trips. Дзеркало TripRepositoryStatusPort. */
export class TripRepositoryBudgetPort implements TripBudgetPort {
  constructor(private readonly trips: TripRepository) {}

  async budget(tripId: string): Promise<{ amount: Money } | null> {
    const trip = await this.trips.findById(tripId);
    if (trip?.budget === undefined) {
      return null;
    }
    return { amount: trip.budget };
  }
}
