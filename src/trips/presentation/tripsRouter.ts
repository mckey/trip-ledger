import { Router } from 'express';
import { z } from 'zod';
import { TripRepository } from '../domain/Trip';
import { CreateTrip } from '../application/CreateTrip';
import { GetTrip } from '../application/GetTrip';
import { ListTrips } from '../application/ListTrips';

const createTripSchema = z
  .object({
    title: z.string().min(1),
    country: z.string().min(1),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
  })
  .refine((body) => body.endsAt >= body.startsAt, {
    message: 'endsAt must not be before startsAt',
  });

export function tripsRouter(trips: TripRepository): Router {
  const router = Router();
  const createTrip = new CreateTrip(trips);
  const getTrip = new GetTrip(trips);
  const listTrips = new ListTrips(trips);

  router.post('/trips', async (req, res) => {
    const parsed = createTripSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(422).json({ errors: parsed.error.issues });
    }
    const trip = await createTrip.execute(parsed.data);
    return res.status(201).json(trip);
  });

  router.get('/trips', async (_req, res) => {
    return res.json(await listTrips.execute());
  });

  router.get('/trips/:id', async (req, res) => {
    const trip = await getTrip.execute(req.params.id);
    if (!trip) {
      return res.status(404).json({ error: 'trip not found' });
    }
    return res.json(trip);
  });

  return router;
}
