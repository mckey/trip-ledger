// Contract mocks for trip-budget, typed by the generated contract (src/contracts/trip-budget.gen.ts).
// The consumer side of the contract: HTTP tests and scripts build expected payloads from here, so a
// contract change that the mocks do not follow breaks `tsc --noEmit`, not a run on the stand.
import type { operations } from './trip-budget.gen';

type Json<Op extends keyof operations, Status extends keyof operations[Op]['responses']> =
  operations[Op]['responses'][Status] extends { content: { 'application/json': infer Body } } ? Body : never;

const TRIP_ID = '00000000-0000-4000-8000-000000000001';

export const setTripBudgetOk = {
  tripId: TRIP_ID,
  budget: { amount: 5_000_000, currency: 'EUR' },
  budgetSetAt: '2026-10-01T08:30:00Z',
} satisfies Json<'setTripBudget', 200>;

export const addExpenseOverspend = {
  expense: {
    id: '00000000-0000-4000-8000-0000000000e1',
    tripId: TRIP_ID,
    amount: { amount: 4500, currency: 'EUR' },
    category: 'food',
    spentAt: '2026-10-03T00:00:00.000Z',
  },
  budget: {
    budget: { amount: 100_000, currency: 'EUR' },
    remaining: { amount: -2500, currency: 'EUR' },
    counted: 7,
    uncounted: 2,
    overspend: true,
  },
} satisfies Json<'addExpense', 201>;

export const addExpenseNoBudget = {
  expense: {
    id: '00000000-0000-4000-8000-0000000000e2',
    tripId: '00000000-0000-4000-8000-000000000002',
    amount: { amount: 1200, currency: 'UAH' },
    category: 'transport',
    spentAt: '2026-10-04T00:00:00.000Z',
  },
  budget: null,
} satisfies Json<'addExpense', 201>;

export const tripSummaryWithBudget = {
  lines: [
    { category: 'food', currency: 'EUR', total: { amount: 102_500, currency: 'EUR' } },
    { category: 'transport', currency: 'UAH', total: { amount: 340_000, currency: 'UAH' } },
  ],
  budget: {
    budget: { amount: 100_000, currency: 'EUR' },
    remaining: { amount: -2500, currency: 'EUR' },
    counted: 7,
    uncounted: 2,
    overspend: true,
  },
} satisfies Json<'getTripSummary', 200>;

export const tripSummaryWithoutBudget = {
  lines: [{ category: 'transport', currency: 'UAH', total: { amount: 340_000, currency: 'UAH' } }],
  budget: null,
} satisfies Json<'getTripSummary', 200>;
