// Приймальний зонд T2 для /goal: DoD story, переписаний у тести до старту цілі.
// Агент цей файл не змінює — умова цілі вимагає порожнього `git diff lesson-7.3-goal -- goal/`.
import { describe, expect, it } from 'vitest';
import { Money } from '../../src/shared/Money';
import { Trip } from '../../src/trips/domain/Trip';
import { BudgetCurrencyMismatchError, TripDoesNotExistError } from '../../src/trips/domain/errors';
import { aTrip } from '../../src/trips/testing/aTrip';

const T0 = new Date('2026-10-02T10:00:00Z');
const T1 = new Date('2026-10-05T18:30:00Z');

describe('T2 acceptance: Trip.setBudget()', () => {
  it('нова поїздка без budget і base currency', () => {
    const trip = aTrip();
    expect(trip.budget).toBeUndefined();
    expect(trip.baseCurrency).toBeUndefined();
    expect(trip.budgetSetAt).toBeUndefined();
  });

  it('AC-01: перше задання зберігає суму, фіксує base currency і час', () => {
    const trip = aTrip();
    trip.setBudget(new Money(150_000, 'EUR'), T0);
    expect(trip.budget?.amount).toBe(150_000);
    expect(trip.budget?.currency).toBe('EUR');
    expect(trip.baseCurrency).toBe('EUR');
    expect(trip.budgetSetAt?.getTime()).toBe(T0.getTime());
  });

  it('AC-07: заміна в тій самій валюті перезаписує суму і budgetSetAt', () => {
    const trip = aTrip();
    trip.setBudget(new Money(150_000, 'EUR'), T0);
    trip.setBudget(new Money(90_000, 'EUR'), T1);
    expect(trip.budget?.amount).toBe(90_000);
    expect(trip.baseCurrency).toBe('EUR');
    expect(trip.budgetSetAt?.getTime()).toBe(T1.getTime());
  });

  it('AC-02: заміна в іншій валюті кидає BudgetCurrencyMismatchError і не мутує стан', () => {
    const trip = aTrip();
    trip.setBudget(new Money(150_000, 'EUR'), T0);
    expect(() => trip.setBudget(new Money(150_000, 'UAH'), T1)).toThrow(BudgetCurrencyMismatchError);
    expect(trip.budget?.amount).toBe(150_000);
    expect(trip.budget?.currency).toBe('EUR');
    expect(trip.budgetSetAt?.getTime()).toBe(T0.getTime());
  });

  it('AC-02: base currency, зафіксована фабрикою без budget, теж блокує іншу валюту', () => {
    const trip = aTrip({ baseCurrency: 'EUR' });
    expect(() => trip.setBudget(new Money(1_000, 'USD'), T0)).toThrow(BudgetCurrencyMismatchError);
    expect(trip.budget).toBeUndefined();
  });

  it('AC-02: нульова сума відкидається і нічого не записує', () => {
    const trip = aTrip();
    expect(() => trip.setBudget(new Money(0, 'EUR'), T0)).toThrow();
    expect(trip.budget).toBeUndefined();
    expect(trip.baseCurrency).toBeUndefined();
    expect(trip.budgetSetAt).toBeUndefined();
  });

  it('AC-09: finished-поїздка приймає budget, статус не змінюється', () => {
    const trip = aTrip({ status: 'finished' });
    trip.setBudget(new Money(50_000, 'UAH'), T0);
    expect(trip.status).toBe('finished');
    expect(trip.budget?.amount).toBe(50_000);
    expect(trip.canAcceptExpenses()).toBe(false);
  });

  it('canAcceptExpenses() від budget не залежить', () => {
    const trip = aTrip({ status: 'active' });
    trip.setBudget(new Money(1, 'EUR'), T0);
    expect(trip.canAcceptExpenses()).toBe(true);
  });
});

describe('T2 acceptance: errors і фабрика', () => {
  it('помилки BC trips — нащадки Error з власним name', () => {
    const notFound = new TripDoesNotExistError('trip-x');
    expect(notFound).toBeInstanceOf(Error);
    expect(notFound.name).toBe('TripDoesNotExistError');
    const mismatch = new BudgetCurrencyMismatchError('EUR', 'UAH');
    expect(mismatch).toBeInstanceOf(Error);
    expect(mismatch.name).toBe('BudgetCurrencyMismatchError');
  });

  it('aTrip() дає дефолти з data-model §Test fixtures', () => {
    const trip = aTrip();
    expect(trip).toBeInstanceOf(Trip);
    expect(trip.title).toBe('Test Trip');
    expect(trip.country).toBe('PT');
    expect(trip.startsAt.toISOString().slice(0, 10)).toBe('2026-10-01');
    expect(trip.endsAt.toISOString().slice(0, 10)).toBe('2026-10-15');
    expect(trip.status).toBe('planned');
  });

  it('aTrip({ budget }) віддає поїздку з уже заданим budget у його валюті', () => {
    const trip = aTrip({ budget: new Money(20_000, 'EUR') });
    expect(trip.budget?.amount).toBe(20_000);
    expect(trip.baseCurrency).toBe('EUR');
  });
});
