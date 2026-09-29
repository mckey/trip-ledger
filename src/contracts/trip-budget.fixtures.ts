// Contract mocks for trip-budget, typed by the generated contract (src/contracts/trip-budget.gen.ts).
// The consumer side of the contract: HTTP tests and scripts build expected payloads from here, so a
// contract change that the mocks do not follow breaks `tsc --noEmit`, not a run on the stand.
import type { operations } from './trip-budget.gen';

type Json<Op extends keyof operations, Status extends keyof operations[Op]['responses']> =
  operations[Op]['responses'][Status] extends { content: { 'application/json': infer Body } } ? Body : never;

const TRIP_ID = '00000000-0000-4000-8000-000000000001';

export const setTripBudgetOk = {
  trip_id: TRIP_ID,
  budget_minor: 5_000_000,
  base_currency: 'EUR',
  budget_set_at: '2026-10-01T08:30:00Z',
} satisfies Json<'setTripBudget', 200>;

export const addExpenseOverspend = {
  expense: {
    id: '00000000-0000-4000-8000-0000000000e1',
    trip_id: TRIP_ID,
    amount_minor: 4500,
    currency_code: 'EUR',
    category: 'food',
    spent_at: '2026-10-03',
  },
  budget: {
    budget_minor: 100_000,
    base_currency: 'EUR',
    remaining_minor: -2500,
    counted: 7,
    uncounted: 2,
    overspend: true,
  },
} satisfies Json<'addExpense', 201>;

export const tripSummaryWithoutBudget = {
  lines: [{ category: 'transport', currency_code: 'UAH', total_minor: 340_000 }],
  budget: null,
} satisfies Json<'getTripSummary', 200>;
