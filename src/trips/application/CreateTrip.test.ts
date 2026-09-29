import { describe, expect, it } from 'vitest';
import { CreateTrip } from './CreateTrip';
import { InMemoryTripRepository } from '../infrastructure/InMemoryTripRepository';

describe('CreateTrip', () => {
  it('persists a planned trip and returns it', async () => {
    const repo = new InMemoryTripRepository();
    const trip = await new CreateTrip(repo).execute({
      title: 'Carpathians hike',
      country: 'UA',
      startsAt: new Date('2026-09-01'),
      endsAt: new Date('2026-09-07'),
    });

    expect(trip.status).toBe('planned');
    expect(await repo.findById(trip.id)).toEqual(trip);
  });

  it('AC-t2-3: stores baseCurrency given at creation, without budget', async () => {
    const repo = new InMemoryTripRepository();
    const trip = await new CreateTrip(repo).execute({
      title: 'Test Trip',
      country: 'PT',
      startsAt: new Date('2026-10-01'),
      endsAt: new Date('2026-10-15'),
      baseCurrency: 'EUR',
    });

    const saved = await repo.findById(trip.id);
    expect(saved?.baseCurrency).toBe('EUR');
    expect(saved?.budget).toBeUndefined();
  });

  it('регрес: without baseCurrency the trip has none', async () => {
    const repo = new InMemoryTripRepository();
    const trip = await new CreateTrip(repo).execute({
      title: 'Test Trip',
      country: 'PT',
      startsAt: new Date('2026-10-01'),
      endsAt: new Date('2026-10-15'),
    });

    expect((await repo.findById(trip.id))?.baseCurrency).toBeUndefined();
  });

  it('rejects end date before start date (domain invariant)', async () => {
    const repo = new InMemoryTripRepository();
    await expect(
      new CreateTrip(repo).execute({
        title: 'Broken',
        country: 'UA',
        startsAt: new Date('2026-09-07'),
        endsAt: new Date('2026-09-01'),
      }),
    ).rejects.toThrow('end date');
  });
});
