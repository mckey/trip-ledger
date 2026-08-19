// Domain-сутність. Ніяких імпортів з application/infrastructure/presentation.

export type TripStatus = 'planned' | 'active' | 'finished';

export class Trip {
  constructor(
    public readonly id: string,
    public readonly title: string,
    public readonly country: string,
    public readonly startsAt: Date,
    public readonly endsAt: Date,
    public status: TripStatus = 'planned',
  ) {
    if (endsAt < startsAt) {
      throw new Error('Trip end date must not be before start date');
    }
  }

  canAcceptExpenses(): boolean {
    return this.status !== 'finished';
  }
}

export interface TripRepository {
  save(trip: Trip): Promise<void>;
  findById(id: string): Promise<Trip | null>;
}
