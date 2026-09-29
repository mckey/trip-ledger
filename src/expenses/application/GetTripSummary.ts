import { ExpenseCategory, ExpenseRepository, TripBudgetPort } from '../domain/Expense';
import { Money } from '../../shared/Money';
import { BudgetBlock, BudgetBlockResult } from './BudgetBlock';

export interface TripSummaryLine {
  category: ExpenseCategory;
  currency: string;
  total: Money;
}

export interface TripSummaryResult {
  lines: TripSummaryLine[];
  budget: BudgetBlockResult | null;
}

export class GetTripSummary {
  constructor(
    private readonly expenses: ExpenseRepository,
    private readonly tripBudget: TripBudgetPort,
  ) {}

  async execute(tripId: string): Promise<TripSummaryResult> {
    const expenses = await this.expenses.findByTrip(tripId);

    const totals = new Map<string, Money>();
    for (const expense of expenses) {
      const key = `${expense.category}:${expense.amount.currency}`;
      const running = totals.get(key);
      totals.set(key, running ? running.add(expense.amount) : expense.amount);
    }

    const lines = [...totals.entries()].map(([key, total]) => {
      const [category, currency] = key.split(':') as [ExpenseCategory, string];
      return { category, currency, total };
    });

    const budget = await this.tripBudget.budget(tripId);

    return {
      lines,
      budget: BudgetBlock(budget?.amount ?? null, expenses),
    };
  }
}
