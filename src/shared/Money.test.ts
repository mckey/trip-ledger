import { describe, expect, it } from 'vitest';
import { Money } from './Money';

describe('Money', () => {
  it('adds amounts in the same currency', () => {
    expect(new Money(1500, 'UAH').add(new Money(500, 'UAH')).amount).toBe(2000);
  });

  it('rejects adding different currencies', () => {
    expect(() => new Money(100, 'UAH').add(new Money(100, 'EUR'))).toThrow();
  });

  it('rejects negative or fractional minor units', () => {
    expect(() => new Money(-1, 'UAH')).toThrow();
    expect(() => new Money(10.5, 'UAH')).toThrow();
  });

  it('rejects amounts beyond Number.MAX_SAFE_INTEGER', () => {
    expect(() => new Money(Number.MAX_SAFE_INTEGER, 'UAH')).not.toThrow();
    expect(() => new Money(Number.MAX_SAFE_INTEGER + 1, 'UAH')).toThrow(
      'Money amount must be a non-negative safe integer of minor units',
    );
  });
});
