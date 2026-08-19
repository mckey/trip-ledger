import { ExpenseCategory, ExpenseRepository } from '../domain/Expense';
import { Money } from '../../shared/Money';

export interface TripSummaryLine {
  category: ExpenseCategory;
  currency: string;
  total: Money;
}

export class GetTripSummary {
  constructor(private readonly expenses: ExpenseRepository) {}

  async execute(tripId: string): Promise<TripSummaryLine[]> {
    const expenses = await this.expenses.findByTrip(tripId);

    const totals = new Map<string, Money>();
    for (const expense of expenses) {
      const key = `${expense.category}:${expense.amount.currency}`;
      const running = totals.get(key);
      totals.set(key, running ? running.add(expense.amount) : expense.amount);
    }

    return [...totals.entries()].map(([key, total]) => {
      const [category, currency] = key.split(':') as [ExpenseCategory, string];
      return { category, currency, total };
    });
  }
}
