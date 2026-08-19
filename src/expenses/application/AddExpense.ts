import { randomUUID } from 'node:crypto';
import { Expense, ExpenseCategory, ExpenseRepository, TripStatusPort } from '../domain/Expense';
import { Money } from '../../shared/Money';
import { TripNotAcceptingExpensesError, TripNotFoundError } from '../domain/errors';

export interface AddExpenseInput {
  tripId: string;
  amount: Money;
  category: ExpenseCategory;
  spentAt: Date;
}

export class AddExpense {
  constructor(
    private readonly expenses: ExpenseRepository,
    private readonly tripStatus: TripStatusPort,
  ) {}

  async execute(input: AddExpenseInput): Promise<Expense> {
    if (!(await this.tripStatus.exists(input.tripId))) {
      throw new TripNotFoundError(input.tripId);
    }
    if (!(await this.tripStatus.canAcceptExpenses(input.tripId))) {
      throw new TripNotAcceptingExpensesError(input.tripId);
    }

    const expense = new Expense(
      randomUUID(),
      input.tripId,
      input.amount,
      input.category,
      input.spentAt,
    );
    await this.expenses.save(expense);
    return expense;
  }
}
