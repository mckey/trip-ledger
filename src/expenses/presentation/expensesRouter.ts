import { Router } from 'express';
import { z } from 'zod';
import { ExpenseRepository, TripBudgetPort, TripStatusPort } from '../domain/Expense';
import { AddExpense } from '../application/AddExpense';
import { ListExpenses } from '../application/ListExpenses';
import { GetTripSummary } from '../application/GetTripSummary';
import { Money } from '../../shared/Money';
import { TripNotAcceptingExpensesError, TripNotFoundError } from '../domain/errors';

const addExpenseSchema = z.object({
  amount: z.number().int().nonnegative(),
  currency: z.string().min(1),
  category: z.enum(['transport', 'lodging', 'food', 'tickets', 'other']),
  spentAt: z.coerce.date(),
});

// tripBudget — новий параметр (T6, ADR-0002/0003). AddExpense/GetTripSummary тепер
// повертають envelope { expense|lines, budget }, але маршрути й форма HTTP-відповіді
// тут навмисно НЕ змінюються — presentation переходить на envelope в T11.
export function expensesRouter(
  expenses: ExpenseRepository,
  tripStatus: TripStatusPort,
  tripBudget: TripBudgetPort,
): Router {
  const router = Router();
  const addExpense = new AddExpense(expenses, tripStatus, tripBudget);
  const listExpenses = new ListExpenses(expenses);
  const getTripSummary = new GetTripSummary(expenses, tripBudget);

  router.post('/trips/:id/expenses', async (req, res) => {
    const parsed = addExpenseSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(422).json({ errors: parsed.error.issues });
    }

    try {
      const result = await addExpense.execute({
        tripId: req.params.id,
        amount: new Money(parsed.data.amount, parsed.data.currency),
        category: parsed.data.category,
        spentAt: parsed.data.spentAt,
      });
      return res.status(201).json(result.expense);
    } catch (err) {
      if (err instanceof TripNotFoundError) {
        return res.status(404).json({ error: err.message });
      }
      if (err instanceof TripNotAcceptingExpensesError) {
        return res.status(409).json({ error: err.message });
      }
      throw err;
    }
  });

  router.get('/trips/:id/expenses', async (req, res) => {
    return res.json(await listExpenses.execute(req.params.id));
  });

  router.get('/trips/:id/summary', async (req, res) => {
    const result = await getTripSummary.execute(req.params.id);
    return res.json(result.lines);
  });

  return router;
}
