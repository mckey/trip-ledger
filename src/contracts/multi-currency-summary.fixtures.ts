// Contract mocks for multi-currency-summary, typed by src/contracts/multi-currency-summary.gen.ts.
// One mock per success response and per nullable branch (`converted: null`, `budget: null`, `rate: null`).
import type { operations } from './multi-currency-summary.gen';

type Json<Op extends keyof operations, Status extends keyof operations[Op]['responses']> =
  operations[Op]['responses'][Status] extends { content: { 'application/json': infer Body } } ? Body : never;

type Req<Op extends keyof operations> =
  operations[Op] extends { requestBody: { content: { 'application/json': infer Body } } } ? Body : never;

const TRIP_ID = '00000000-0000-4000-8000-000000000001';
const EXPENSE_ID = '00000000-0000-4000-8000-0000000000e1';

export const createTripRequest = {
  title: 'Test Trip',
  country: 'PT',
  startsAt: '2026-10-01',
  endsAt: '2026-10-15',
  baseCurrency: 'EUR',
} satisfies Req<'createTrip'>;

export const createTripOk = {
  id: TRIP_ID,
  title: 'Test Trip',
  country: 'PT',
  startsAt: '2026-10-01T00:00:00.000Z',
  endsAt: '2026-10-15T00:00:00.000Z',
  status: 'planned',
  baseCurrency: 'EUR',
} satisfies Json<'createTrip', 201>;

export const setTripBaseCurrencyOk = {
  ...createTripOk,
  status: 'active',
} satisfies Json<'setTripBaseCurrency', 200>;

export const addForeignExpenseRequest = {
  amount: 150_000,
  currency: 'CZK',
  category: 'food',
  spentAt: '2026-10-03',
  rate: '0.039800000',
} satisfies Req<'addExpense'>;

export const addExpenseWithBudget = {
  expense: {
    id: EXPENSE_ID,
    tripId: TRIP_ID,
    amount: { amount: 150_000, currency: 'CZK' },
    category: 'food',
    spentAt: '2026-10-03T00:00:00.000Z',
    rate: '0.039800000',
  },
  budget: {
    budget: { amount: 100_000, currency: 'EUR' },
    remaining: { amount: -1470, currency: 'EUR' },
    counted: 8,
    uncounted: 1,
    overspend: true,
  },
} satisfies Json<'addExpense', 201>;

export const addBaseCurrencyExpenseWithoutBudget = {
  expense: {
    id: '00000000-0000-4000-8000-0000000000e2',
    tripId: TRIP_ID,
    amount: { amount: 4500, currency: 'EUR' },
    category: 'transport',
    spentAt: '2026-10-03T00:00:00.000Z',
    rate: null,
  },
  budget: null,
} satisfies Json<'addExpense', 201>;

export const setExpenseRateOk = {
  ...addExpenseWithBudget.expense,
  rate: '0.039750000',
} satisfies Json<'setExpenseRate', 200>;

export const tripSummaryConverted = {
  lines: [
    { category: 'food', currency: 'CZK', total: { amount: 150_000, currency: 'CZK' } },
    { category: 'food', currency: 'EUR', total: { amount: 95_500, currency: 'EUR' } },
    { category: 'transport', currency: 'HUF', total: { amount: 800_000, currency: 'HUF' } },
  ],
  converted: { total: { amount: 101_470, currency: 'EUR' }, withoutRate: 1 },
  budget: {
    budget: { amount: 100_000, currency: 'EUR' },
    remaining: { amount: -1470, currency: 'EUR' },
    counted: 8,
    uncounted: 1,
    overspend: true,
  },
} satisfies Json<'getTripSummary', 200>;

export const tripSummaryWithoutBaseCurrency = {
  lines: [{ category: 'transport', currency: 'UAH', total: { amount: 1200, currency: 'UAH' } }],
  converted: null,
  budget: null,
} satisfies Json<'getTripSummary', 200>;
