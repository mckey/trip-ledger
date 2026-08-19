import { Trip, TripRepository } from '../domain/Trip';

export class GetTrip {
  constructor(private readonly trips: TripRepository) {}

  async execute(id: string): Promise<Trip | null> {
    return this.trips.findById(id);
  }
}
