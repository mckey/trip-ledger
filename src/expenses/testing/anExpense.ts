import { randomUUID } from 'node:crypto';
import { Expense, ExpenseCategory } from '../domain/Expense';
import { Money } from '../../shared/Money';

const TEST_TRIP_ID = '00000000-0000-7000-8000-000000000001';

export interface AnExpenseOptions {
  id?: string;
  tripId?: string;
  amount?: Money;
  currency?: string;
  category?: ExpenseCategory;
  spentAt?: Date;
}

/** Тестова фабрика фікстур BC expenses (data-model.md §Test fixtures). Дефолт валюти — EUR. */
export function anExpense(options: AnExpenseOptions = {}): Expense {
  const currency = options.currency ?? 'EUR';

  return new Expense(
    options.id ?? randomUUID(),
    options.tripId ?? TEST_TRIP_ID,
    options.amount ?? new Money(1000, currency),
    options.category ?? 'food',
    options.spentAt ?? new Date('2026-10-02'),
  );
}
