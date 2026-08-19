import { Expense, ExpenseRepository } from '../domain/Expense';

/** Test double and local-dev fallback. Not for production. */
export class InMemoryExpenseRepository implements ExpenseRepository {
  private readonly rows = new Map<string, Expense>();

  async save(expense: Expense): Promise<void> {
    this.rows.set(expense.id, expense);
  }

  async findByTrip(tripId: string): Promise<Expense[]> {
    return [...this.rows.values()].filter((expense) => expense.tripId === tripId);
  }
}
