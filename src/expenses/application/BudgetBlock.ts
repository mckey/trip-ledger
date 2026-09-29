// Application-шар BC expenses. Чиста функція, не use case: без портів і побічних ефектів.
import { Expense } from '../domain/Expense';
import { Money } from '../../shared/Money';
import { Balance } from '../../shared/Balance';

export interface BudgetBlockResult {
  budget: Money;
  remaining: Balance;
  counted: number;
  uncounted: number;
  overspend: boolean;
}

/**
 * (budget, expenses[]) → { budget, remaining, counted, uncounted, overspend } — ADR-0002.
 *
 * - `budget === null` (у поїздки budget не встановлено) → `null`: рахувати нема відносно чого.
 * - Витрата зараховується у Σ counted, лише якщо її валюта збігається з `budget.currency`;
 *   інакше вона лише збільшує `uncounted` (AC-06/AC-06b) — конвертація тут не робиться.
 * - `remaining = budget − Σ counted` як Balance: може бути від'ємним, знак не приховується (AC-03b).
 * - Вхідний масив `expenses` і його елементи не мутуються (AC-05).
 */
export function BudgetBlock(budget: Money | null, expenses: readonly Expense[]): BudgetBlockResult | null {
  if (budget === null) {
    return null;
  }

  let countedTotal = new Money(0, budget.currency);
  let counted = 0;
  let uncounted = 0;

  for (const expense of expenses) {
    if (expense.amount.currency === budget.currency) {
      countedTotal = countedTotal.add(expense.amount);
      counted += 1;
    } else {
      uncounted += 1;
    }
  }

  const remaining = Balance.of(budget).minus(countedTotal);

  return {
    budget,
    remaining,
    counted,
    uncounted,
    overspend: remaining.isNegative(),
  };
}
