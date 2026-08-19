import { Trip, TripRepository } from '../domain/Trip';

export class ListTrips {
  constructor(private readonly trips: TripRepository) {}

  async execute(): Promise<Trip[]> {
    return this.trips.list();
  }
}
