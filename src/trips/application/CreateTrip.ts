import { randomUUID } from 'node:crypto';
import { Trip, TripRepository } from '../domain/Trip';

export interface CreateTripInput {
  title: string;
  country: string;
  startsAt: Date;
  endsAt: Date;
}

export class CreateTrip {
  constructor(private readonly trips: TripRepository) {}

  async execute(input: CreateTripInput): Promise<Trip> {
    const trip = new Trip(
      randomUUID(),
      input.title,
      input.country,
      input.startsAt,
      input.endsAt,
    );
    await this.trips.save(trip);
    return trip;
  }
}
