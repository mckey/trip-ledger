import { TripRepository } from '../../trips/domain/Trip';
import { TripStatusPort } from '../domain/Expense';

/** Адаптер порту expenses поверх trips. Єдине місце, де expenses "бачить" trips. */
export class TripRepositoryStatusPort implements TripStatusPort {
  constructor(private readonly trips: TripRepository) {}

  async exists(tripId: string): Promise<boolean> {
    return (await this.trips.findById(tripId)) !== null;
  }

  async canAcceptExpenses(tripId: string): Promise<boolean> {
    const trip = await this.trips.findById(tripId);
    return trip?.canAcceptExpenses() ?? false;
  }
}
