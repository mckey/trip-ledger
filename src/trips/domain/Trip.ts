// Domain-сутність. Ніяких імпортів з application/infrastructure/presentation.

import { Money } from '../../shared/Money';
import { BaseCurrencyLockedError, BudgetCurrencyMismatchError } from './errors';

export type TripStatus = 'planned' | 'active' | 'finished';

export class Trip {
  budget?: Money;
  baseCurrency?: string;
  budgetSetAt?: Date;

  constructor(
    public readonly id: string,
    public readonly title: string,
    public readonly country: string,
    public readonly startsAt: Date,
    public readonly endsAt: Date,
    public status: TripStatus = 'planned',
  ) {
    if (endsAt < startsAt) {
      throw new Error('Trip end date must not be before start date');
    }
  }

  canAcceptExpenses(): boolean {
    return this.status !== 'finished';
  }

  finish(): void {
    if (this.status === 'finished') {
      throw new Error(`Trip ${this.id} is already finished`);
    }
    this.status = 'finished';
  }

  setBudget(money: Money, now: Date): void {
    if (money.amount <= 0) {
      throw new Error('Trip budget amount must be positive');
    }
    if (this.baseCurrency !== undefined && this.baseCurrency !== money.currency) {
      throw new BudgetCurrencyMismatchError(this.baseCurrency, money.currency);
    }
    this.budget = money;
    this.baseCurrency = money.currency;
    this.budgetSetAt = now;
  }

  setBaseCurrency(currency: string, hasRatedExpenses: boolean): void {
    if (this.baseCurrency === currency) return;
    if (this.baseCurrency !== undefined && hasRatedExpenses) {
      throw new BaseCurrencyLockedError(this.baseCurrency, currency);
    }
    this.baseCurrency = currency;
  }
}

export interface RatedExpensesPort {
  hasRatedExpenses(tripId: string): Promise<boolean>;
}

export interface TripRepository {
  save(trip: Trip): Promise<void>;
  findById(id: string): Promise<Trip | null>;
  list(): Promise<Trip[]>;
}
