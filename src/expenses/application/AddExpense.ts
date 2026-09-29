import { randomUUID } from 'node:crypto';
import { Expense, ExpenseCategory, ExpenseRepository, TripBudgetPort, TripStatusPort } from '../domain/Expense';
import { Money } from '../../shared/Money';
import { TripNotAcceptingExpensesError, TripNotFoundError } from '../domain/errors';
import { BudgetBlock, BudgetBlockResult } from './BudgetBlock';

export interface AddExpenseInput {
  tripId: string;
  amount: Money;
  category: ExpenseCategory;
  spentAt: Date;
}

export interface AddExpenseResult {
  expense: Expense;
  budget: BudgetBlockResult | null;
}

export class AddExpense {
  constructor(
    private readonly expenses: ExpenseRepository,
    private readonly tripStatus: TripStatusPort,
    private readonly tripBudget: TripBudgetPort,
  ) {}

  async execute(input: AddExpenseInput): Promise<AddExpenseResult> {
    if (!(await this.tripStatus.exists(input.tripId))) {
      throw new TripNotFoundError(input.tripId);
    }
    if (!(await this.tripStatus.canAcceptExpenses(input.tripId))) {
      throw new TripNotAcceptingExpensesError(input.tripId);
    }

    // Обидва читання — до save(): якщо порт budget або репозиторій кинуть тут, жодна витрата
    // ще не збережена, і повтор запиту безпечний (review F2 — інакше падіння між save() і
    // читанням budget лишало б витрату застряглою в репозиторії без повернутого budget-блоку,
    // а ретрай клієнта створював би дублі).
    const budget = await this.tripBudget.budget(input.tripId);
    const existingExpenses = await this.expenses.findByTrip(input.tripId);

    const expense = new Expense(
      randomUUID(),
      input.tripId,
      input.amount,
      input.category,
      input.spentAt,
    );
    await this.expenses.save(expense);

    // Після save() лишається тільки чиста функція — BudgetBlock рахується завжди, незалежно
    // від того, чи встановлено budget (ADR-0003), і не може впасти.
    return {
      expense,
      budget: BudgetBlock(budget?.amount ?? null, [...existingExpenses, expense]),
    };
  }
}
