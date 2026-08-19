// Domain-сутність BC expenses. З trips зв'язок тільки через tripId і TripStatusPort.
import { Money } from '../../shared/Money';

export type ExpenseCategory = 'transport' | 'lodging' | 'food' | 'tickets' | 'other';

export class Expense {
  constructor(
    public readonly id: string,
    public readonly tripId: string,
    public readonly amount: Money,
    public readonly category: ExpenseCategory,
    public readonly spentAt: Date,
  ) {}
}

export interface ExpenseRepository {
  save(expense: Expense): Promise<void>;
  findByTrip(tripId: string): Promise<Expense[]>;
}

/** Порт до BC trips: реалізується в infrastructure, domain про trips не знає. */
export interface TripStatusPort {
  canAcceptExpenses(tripId: string): Promise<boolean>;
}
