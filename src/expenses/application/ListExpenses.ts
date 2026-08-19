import { Expense, ExpenseRepository } from '../domain/Expense';

export class ListExpenses {
  constructor(private readonly expenses: ExpenseRepository) {}

  async execute(tripId: string): Promise<Expense[]> {
    return this.expenses.findByTrip(tripId);
  }
}
