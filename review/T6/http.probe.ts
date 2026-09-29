// Видимий канал T6 (координатор): живий HTTP через createApp + in-memory репо.
import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/presentation/app';
import { InMemoryTripRepository } from '../../src/trips/infrastructure/InMemoryTripRepository';
import { InMemoryExpenseRepository } from '../../src/expenses/infrastructure/InMemoryExpenseRepository';
import { aTrip } from '../../src/trips/testing/aTrip';
import { Money } from '../../src/shared/Money';
import { appendFileSync } from 'node:fs';
const log = (...a: unknown[]) => appendFileSync('review/T6/http.probe.log', a.join(' ') + String.fromCharCode(10));

const body = { amount: 1500, currency: 'UAH', category: 'food', spentAt: '2026-10-02' };

describe('T6 HTTP probe', () => {
  it('wire shape unchanged: POST → 201 with bare expense, summary → array', async () => {
    const trips = new InMemoryTripRepository();
    const trip = aTrip({ budget: new Money(1000, 'UAH') });
    await trips.save(trip);
    const app = createApp({ trips, expenses: new InMemoryExpenseRepository() });
    const post = await request(app).post(`/trips/${trip.id}/expenses`).send(body);
    log('POST', post.status, Object.keys(post.body).sort().join(','));
    expect(post.status).toBe(201);
    expect(Object.keys(post.body).sort()).toEqual(['amount', 'category', 'id', 'spentAt', 'tripId']);
    const sum = await request(app).get(`/trips/${trip.id}/summary`);
    log('SUMMARY', sum.status, JSON.stringify(sum.body));
    expect(Array.isArray(sum.body)).toBe(true);
  });

  it('budget port fails AFTER save → what does the client see, what is stored?', async () => {
    const trips = new InMemoryTripRepository();
    const trip = aTrip({ budget: new Money(1000, 'UAH') });
    await trips.save(trip);
    let calls = 0;
    const flaky = { ...trips, save: trips.save.bind(trips), list: trips.list.bind(trips),
      findById: async (id: string) => { calls++; if (calls > 2) throw new Error('trips down'); return trips.findById(id); } };
    const expenses = new InMemoryExpenseRepository();
    const app = createApp({ trips: flaky as any, expenses });
    const post = await request(app).post(`/trips/${trip.id}/expenses`).send(body);
    const stored = await expenses.findByTrip(trip.id);
    log('FLAKY POST', post.status, 'stored:', stored.length, 'findById calls:', calls);
    const retry = await request(createApp({ trips, expenses })).post(`/trips/${trip.id}/expenses`).send(body);
    log('RETRY POST', retry.status, 'stored after retry:', (await expenses.findByTrip(trip.id)).length);
  });
});

describe("T6 F1 probe", () => {
  it("InMemoryExpenseRepository returns same object references?", async () => {
    const expenses = new InMemoryExpenseRepository();
    const trips = new InMemoryTripRepository(); const trip = aTrip(); await trips.save(trip);
    await request(createApp({ trips, expenses })).post(`/trips/${trip.id}/expenses`).send(body);
    const a = await expenses.findByTrip(trip.id); const b = await expenses.findByTrip(trip.id);
    log("SAME REF", a[0] === b[0], "| amount frozen", Object.isFrozen(a[0].amount));
  });
});
