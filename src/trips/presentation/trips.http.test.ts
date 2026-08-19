import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../presentation/app';
import { InMemoryTripRepository } from '../infrastructure/InMemoryTripRepository';
import { InMemoryExpenseRepository } from '../../expenses/infrastructure/InMemoryExpenseRepository';

function makeApp() {
  return createApp({ trips: new InMemoryTripRepository(), expenses: new InMemoryExpenseRepository() });
}

const validBody = {
  title: 'Lisbon long weekend',
  country: 'PT',
  startsAt: '2026-10-02',
  endsAt: '2026-10-05',
};

describe('trips HTTP API', () => {
  it('POST /trips creates a trip (201) and GET /trips/:id returns it', async () => {
    const app = makeApp();
    const created = await request(app).post('/trips').send(validBody).expect(201);
    expect(created.body.status).toBe('planned');

    const fetched = await request(app).get(`/trips/${created.body.id}`).expect(200);
    expect(fetched.body.title).toBe(validBody.title);
  });

  it('POST /trips with endsAt before startsAt is rejected with 422', async () => {
    const app = makeApp();
    await request(app)
      .post('/trips')
      .send({ ...validBody, startsAt: '2026-10-05', endsAt: '2026-10-02' })
      .expect(422);
  });

  it('GET /trips lists created trips', async () => {
    const app = makeApp();
    await request(app).post('/trips').send(validBody).expect(201);
    const list = await request(app).get('/trips').expect(200);
    expect(list.body).toHaveLength(1);
  });

  it('GET /trips/:id returns 404 for unknown id', async () => {
    await request(makeApp()).get('/trips/nope').expect(404);
  });
});
