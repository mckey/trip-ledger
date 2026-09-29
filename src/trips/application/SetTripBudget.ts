import { Money } from '../../shared/Money';
import { Trip, TripRepository } from '../domain/Trip';
import { TripDoesNotExistError } from '../domain/errors';

export interface SetTripBudgetInput {
  tripId: string;
  budget: Money;
}

export class SetTripBudget {
  constructor(private readonly tripRepository: TripRepository) {}

  async execute(input: SetTripBudgetInput): Promise<Trip> {
    const trip = await this.tripRepository.findById(input.tripId);
    if (!trip) {
      throw new TripDoesNotExistError(input.tripId);
    }

    trip.setBudget(input.budget, new Date());
    await this.tripRepository.save(trip);

    return trip;
  }
}
