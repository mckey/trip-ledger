import { Trip, TripRepository } from '../domain/Trip';

/** Test double and local-dev fallback. Not for production. */
export class InMemoryTripRepository implements TripRepository {
  private readonly rows = new Map<string, Trip>();

  async save(trip: Trip): Promise<void> {
    this.rows.set(trip.id, trip);
  }

  async findById(id: string): Promise<Trip | null> {
    return this.rows.get(id) ?? null;
  }

  async list(): Promise<Trip[]> {
    return [...this.rows.values()];
  }
}
