import { describe, expect, it } from 'vitest';
import { BudgetBlock } from './BudgetBlock';
import { Money } from '../../shared/Money';
import { anExpense } from '../testing/anExpense';

describe('BudgetBlock', () => {
  it('remaining = budget − Σ counted у мінорних одиницях (AC-03)', () => {
    const budget = new Money(100_000, 'EUR');
    const expenses = [
      anExpense({ currency: 'EUR', amount: new Money(30_000, 'EUR') }),
      anExpense({ currency: 'EUR', amount: new Money(20_000, 'EUR') }),
    ];

    const block = BudgetBlock(budget, expenses);

    expect(block).not.toBeNull();
    expect(block?.budget).toEqual(budget);
    expect(block?.remaining.amount).toBe(50_000);
    expect(block?.remaining.currency).toBe('EUR');
    expect(block?.counted).toBe(2);
    expect(block?.uncounted).toBe(0);
    expect(block?.overspend).toBe(false);
  });

  it('від’ємний remaining лишається від’ємним, overspend: true (AC-03b)', () => {
    const budget = new Money(100_000, 'EUR');
    const expenses = [
      anExpense({ amount: new Money(70_000, 'EUR') }),
      anExpense({ amount: new Money(55_000, 'EUR') }),
    ];

    const block = BudgetBlock(budget, expenses);

    expect(block?.remaining.amount).toBe(-25_000);
    expect(block?.remaining.isNegative()).toBe(true);
    expect(block?.overspend).toBe(true);
  });

  it('витрати в іншій валюті лише збільшують uncounted, не входять у Σ (AC-06)', () => {
    const budget = new Money(100_000, 'EUR');
    const expenses = [
      anExpense({ amount: new Money(30_000, 'EUR') }),
      anExpense({ amount: new Money(5_000_000, 'UAH') }),
    ];

    const block = BudgetBlock(budget, expenses);

    expect(block?.counted).toBe(1);
    expect(block?.uncounted).toBe(1);
    expect(block?.remaining.amount).toBe(70_000);
    expect(block?.overspend).toBe(false);
  });

  it('усі чужовалютні → remaining = повний budget, uncounted = кількість усіх (AC-06b)', () => {
    const budget = new Money(100_000, 'EUR');
    const expenses = [
      anExpense({ amount: new Money(1_000_000, 'UAH') }),
      anExpense({ amount: new Money(2_000_000, 'UAH') }),
      anExpense({ amount: new Money(50, 'USD') }),
    ];

    const block = BudgetBlock(budget, expenses);

    expect(block?.counted).toBe(0);
    expect(block?.uncounted).toBe(3);
    expect(block?.remaining.amount).toBe(budget.amount);
    expect(block?.remaining.currency).toBe(budget.currency);
    expect(block?.overspend).toBe(false);
  });

  it('вхідні Expense не мутуються (AC-05)', () => {
    const budget = new Money(100_000, 'EUR');
    const expense = anExpense({ amount: new Money(30_000, 'EUR') });
    const snapshotAmount = expense.amount;

    BudgetBlock(budget, [expense]);

    expect(expense.amount).toBe(snapshotAmount);
    expect(expense.amount.amount).toBe(30_000);
    expect(expense.amount.currency).toBe('EUR');
  });

  it('без budget (null) повертає null', () => {
    const expenses = [anExpense({ amount: new Money(30_000, 'EUR') })];
    expect(BudgetBlock(null, expenses)).toBeNull();
  });

  it('порожній список витрат без перевитрати: remaining = повний budget', () => {
    const budget = new Money(42_00, 'UAH');
    const block = BudgetBlock(budget, []);

    expect(block?.counted).toBe(0);
    expect(block?.uncounted).toBe(0);
    expect(block?.remaining.amount).toBe(42_00);
    expect(block?.overspend).toBe(false);
  });
});
