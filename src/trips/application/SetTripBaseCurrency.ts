import { RatedExpensesPort, Trip, TripRepository } from '../domain/Trip';

export class SetTripBaseCurrency {
  constructor(
    private readonly tripRepository: TripRepository,
    private readonly ratedExpenses: RatedExpensesPort,
  ) {}

  async execute(_tripId: string, _currency: string): Promise<Trip> {
    throw new Error('not implemented');
  }
}
