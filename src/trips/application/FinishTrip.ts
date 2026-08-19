import { Trip, TripRepository } from '../domain/Trip';

export interface FinishTripInput {
  tripId: string;
}

export class FinishTrip {
  constructor(private readonly tripRepository: TripRepository) {}

  async execute(input: FinishTripInput): Promise<Trip> {
    const trip = await this.tripRepository.findById(input.tripId);
    if (!trip) {
      throw new Error(`Trip ${input.tripId} not found`);
    }

    trip.finish();
    await this.tripRepository.save(trip);

    return trip;
  }
}
