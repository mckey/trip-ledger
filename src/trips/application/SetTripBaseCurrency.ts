import { RatedExpensesPort, Trip, TripRepository } from '../domain/Trip';

export class SetTripBaseCurrency {
  constructor(
    private readonly tripRepository: TripRepository,
    private readonly ratedExpenses: RatedExpensesPort,
  ) {}

  async execute(tripId: string, currency: string): Promise<Trip> {
    void this.tripRepository;
    void this.ratedExpenses;
    void tripId;
    void currency;
    throw new Error('not implemented');
  }
}
