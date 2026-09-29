import express, { Express } from 'express';
import { TripRepository } from '../trips/domain/Trip';
import { tripsRouter } from '../trips/presentation/tripsRouter';
import { ExpenseRepository } from '../expenses/domain/Expense';
import { expensesRouter } from '../expenses/presentation/expensesRouter';
import { TripRepositoryStatusPort } from '../expenses/infrastructure/TripRepositoryStatusPort';
import { TripRepositoryBudgetPort } from '../expenses/infrastructure/TripRepositoryBudgetPort';

/** App factory — repositories injected so tests can pass in-memory doubles. */
export function createApp(deps: { trips: TripRepository; expenses: ExpenseRepository }): Express {
  const app = express();
  app.use(express.json());
  app.use(tripsRouter(deps.trips));
  app.use(
    expensesRouter(deps.expenses, new TripRepositoryStatusPort(deps.trips), new TripRepositoryBudgetPort(deps.trips)),
  );
  return app;
}
