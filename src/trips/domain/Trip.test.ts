import { describe, expect, it } from 'vitest';
import { Money } from '../../shared/Money';
import { Trip } from './Trip';
import { BaseCurrencyLockedError, BudgetCurrencyMismatchError } from './errors';
import { aTrip } from '../testing/aTrip';

const T0 = new Date('2026-10-02T10:00:00Z');
const T1 = new Date('2026-10-05T18:30:00Z');

describe('Trip.setBaseCurrency()', () => {
  it('AC-t1-1: перше задання проходить навіть з явними курсами', () => {
    const trip = aTrip();
    trip.setBaseCurrency('EUR', true);
    expect(trip.baseCurrency).toBe('EUR');
  });

  it('AC-t1-2: зміна валюти з явними курсами кидає BaseCurrencyLockedError і не мутує стан', () => {
    const trip = aTrip({ baseCurrency: 'EUR' });
    expect(() => trip.setBaseCurrency('PLN', true)).toThrow(BaseCurrencyLockedError);
    expect(trip.baseCurrency).toBe('EUR');
  });

  it('AC-t1-3: зміна валюти без явних курсів (лише похідний курс 1) проходить', () => {
    const trip = aTrip({ baseCurrency: 'EUR' });
    trip.setBaseCurrency('PLN', false);
    expect(trip.baseCurrency).toBe('PLN');
  });

  it('AC-t1-4: base currency задається без budget, budget лишається відсутнім', () => {
    const trip = aTrip();
    trip.setBaseCurrency('EUR', false);
    expect(trip.baseCurrency).toBe('EUR');
    expect(trip.budget).toBeUndefined();
  });

  it('AC-t1-5: та сама валюта з явними курсами — no-op без помилки', () => {
    const trip = aTrip({ baseCurrency: 'EUR' });
    expect(() => trip.setBaseCurrency('EUR', true)).not.toThrow();
    expect(trip.baseCurrency).toBe('EUR');
  });
});

describe('Trip.setBudget()', () => {
  it('перше задання фіксує base currency, суму і час', () => {
    const trip = aTrip();
    trip.setBudget(new Money(150_000, 'EUR'), T0);
    expect(trip.budget?.amount).toBe(150_000);
    expect(trip.budget?.currency).toBe('EUR');
    expect(trip.baseCurrency).toBe('EUR');
    expect(trip.budgetSetAt?.getTime()).toBe(T0.getTime());
  });

  it('заміна в тій самій валюті перезаписує суму і budgetSetAt без журналу', () => {
    const trip = aTrip();
    trip.setBudget(new Money(150_000, 'EUR'), T0);
    trip.setBudget(new Money(90_000, 'EUR'), T1);
    expect(trip.budget?.amount).toBe(90_000);
    expect(trip.baseCurrency).toBe('EUR');
    expect(trip.budgetSetAt?.getTime()).toBe(T1.getTime());
  });

  it('заміна в іншій валюті кидає BudgetCurrencyMismatchError і не мутує стан', () => {
    const trip = aTrip();
    trip.setBudget(new Money(150_000, 'EUR'), T0);
    expect(() => trip.setBudget(new Money(150_000, 'UAH'), T1)).toThrow(BudgetCurrencyMismatchError);
    expect(trip.budget?.amount).toBe(150_000);
    expect(trip.budget?.currency).toBe('EUR');
    expect(trip.budgetSetAt?.getTime()).toBe(T0.getTime());
  });

  it('нульова сума відкидається і нічого не записує', () => {
    const trip = aTrip();
    expect(() => trip.setBudget(new Money(0, 'EUR'), T0)).toThrow();
    expect(trip.budget).toBeUndefined();
    expect(trip.baseCurrency).toBeUndefined();
    expect(trip.budgetSetAt).toBeUndefined();
  });

  it('на finished-поїздці проходить, статус не змінюється', () => {
    const trip = aTrip({ status: 'finished' });
    trip.setBudget(new Money(50_000, 'UAH'), T0);
    expect(trip.status).toBe('finished');
    expect(trip.budget?.amount).toBe(50_000);
    expect(trip.canAcceptExpenses()).toBe(false);
  });

  it('нова поїздка без budget і base currency', () => {
    const trip = aTrip();
    expect(trip).toBeInstanceOf(Trip);
    expect(trip.budget).toBeUndefined();
    expect(trip.baseCurrency).toBeUndefined();
    expect(trip.budgetSetAt).toBeUndefined();
  });
});
