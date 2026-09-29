import { RatedExpensesPort, Trip, TripRepository } from '../domain/Trip';
import { TripDoesNotExistError } from '../domain/errors';

export class SetTripBaseCurrency {
  constructor(
    private readonly tripRepository: TripRepository,
    private readonly ratedExpenses: RatedExpensesPort,
  ) {}

  async execute(tripId: string, currency: string): Promise<Trip> {
    const trip = await this.tripRepository.findById(tripId);
    if (!trip) {
      throw new TripDoesNotExistError(tripId);
    }

    // Порт питаємо лише коли валюта вже задана й відрізняється (перше задання і no-op — без нього).
    const needsLockCheck = trip.baseCurrency !== undefined && trip.baseCurrency !== currency;
    const hasRated = needsLockCheck ? await this.ratedExpenses.hasRatedExpenses(tripId) : false;

    trip.setBaseCurrency(currency, hasRated);
    await this.tripRepository.save(trip);

    return trip;
  }
}
