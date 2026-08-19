import express, { Express } from 'express';
import { TripRepository } from '../trips/domain/Trip';
import { tripsRouter } from '../trips/presentation/tripsRouter';

/** App factory — repositories injected so tests can pass in-memory doubles. */
export function createApp(deps: { trips: TripRepository }): Express {
  const app = express();
  app.use(express.json());
  app.use(tripsRouter(deps.trips));
  return app;
}
