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
    if (trip.baseCurrency === currency) {
      return trip;
    }
    const hasRated =
      trip.baseCurrency !== undefined && (await this.ratedExpenses.hasRatedExpenses(tripId));
    trip.setBaseCurrency(currency, hasRated);
    await this.tripRepository.save(trip);
    return trip;
  }
}
