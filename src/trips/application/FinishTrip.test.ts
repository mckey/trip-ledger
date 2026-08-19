import { describe, expect, it } from 'vitest';
import { Trip, TripRepository } from '../domain/Trip';
import { FinishTrip } from './FinishTrip';

class InMemoryTripRepository implements TripRepository {
  private trips = new Map<string, Trip>();

  seed(trip: Trip): void {
    this.trips.set(trip.id, trip);
  }

  async save(trip: Trip): Promise<void> {
    this.trips.set(trip.id, trip);
  }

  async findById(id: string): Promise<Trip | null> {
    return this.trips.get(id) ?? null;
  }
}

function makeTrip(status: Trip['status'] = 'active'): Trip {
  return new Trip(
    'trip-1',
    'Карпати',
    'UA',
    new Date('2026-09-01'),
    new Date('2026-09-05'),
    status,
  );
}

describe('FinishTrip', () => {
  it('переводить активну поїздку в статус finished і зберігає її', async () => {
    const repository = new InMemoryTripRepository();
    repository.seed(makeTrip('active'));
    const useCase = new FinishTrip(repository);

    const trip = await useCase.execute({ tripId: 'trip-1' });

    expect(trip.status).toBe('finished');
    const saved = await repository.findById('trip-1');
    expect(saved?.status).toBe('finished');
  });

  it('кидає помилку, якщо поїздка вже finished', async () => {
    const repository = new InMemoryTripRepository();
    repository.seed(makeTrip('finished'));
    const useCase = new FinishTrip(repository);

    await expect(useCase.execute({ tripId: 'trip-1' })).rejects.toThrow(
      'Trip trip-1 is already finished',
    );
  });

  it('кидає помилку, якщо поїздку не знайдено', async () => {
    const repository = new InMemoryTripRepository();
    const useCase = new FinishTrip(repository);

    await expect(useCase.execute({ tripId: 'missing' })).rejects.toThrow(
      'Trip missing not found',
    );
  });
});
