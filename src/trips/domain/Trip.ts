// Domain-сутність. Ніяких імпортів з application/infrastructure/presentation.

import { Money } from '../../shared/Money';
import { BudgetCurrencyMismatchError } from './errors';

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

  setBaseCurrency(_currency: string, _hasRatedExpenses: boolean): void {
    throw new Error('not implemented');
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
