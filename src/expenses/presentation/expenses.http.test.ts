import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../presentation/app';
import { InMemoryTripRepository } from '../../trips/infrastructure/InMemoryTripRepository';
import { InMemoryExpenseRepository } from '../infrastructure/InMemoryExpenseRepository';
import { Trip } from '../../trips/domain/Trip';

async function makeApp() {
  const trips = new InMemoryTripRepository();
  const expenses = new InMemoryExpenseRepository();
  const trip = new Trip('trip-1', 'Lisbon', 'PT', new Date('2026-10-02'), new Date('2026-10-05'));
  await trips.save(trip);
  return { app: createApp({ trips, expenses }), trips };
}

const validBody = {
  amount: 1500,
  currency: 'EUR',
  category: 'food',
  spentAt: '2026-10-03',
};

describe('expenses HTTP API', () => {
  it('POST /trips/:id/expenses adds an expense (201)', async () => {
    const { app } = await makeApp();
    const created = await request(app).post('/trips/trip-1/expenses').send(validBody).expect(201);
    expect(created.body.category).toBe('food');

    const list = await request(app).get('/trips/trip-1/expenses').expect(200);
    expect(list.body).toHaveLength(1);
  });

  it('POST with an invalid body is rejected with 422', async () => {
    const { app } = await makeApp();
    await request(app)
      .post('/trips/trip-1/expenses')
      .send({ ...validBody, category: 'not-a-category' })
      .expect(422);
  });

  it('POST for an unknown trip is rejected with 404', async () => {
    const { app } = await makeApp();
    await request(app).post('/trips/nope/expenses').send(validBody).expect(404);
  });

  it('POST for a finished trip is rejected with 409', async () => {
    const { app, trips } = await makeApp();
    const trip = await trips.findById('trip-1');
    trip!.finish();
    await trips.save(trip!);

    await request(app).post('/trips/trip-1/expenses').send(validBody).expect(409);
  });

  it('GET /trips/:id/summary returns totals by category', async () => {
    const { app } = await makeApp();
    await request(app).post('/trips/trip-1/expenses').send(validBody).expect(201);

    const summary = await request(app).get('/trips/trip-1/summary').expect(200);
    expect(summary.body).toEqual([{ category: 'food', currency: 'EUR', total: { amount: 1500, currency: 'EUR' } }]);
  });
});
