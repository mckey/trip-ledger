import { describe, expect, it } from 'vitest';
import { Money } from './Money';
import { Balance } from './Balance';

// Детермінований LCG: property-тест відтворюваний без fast-check.
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

describe('Balance', () => {
  it('of(Money) переносить суму і валюту', () => {
    const b = Balance.of(new Money(1500, 'UAH'));
    expect(b.amount).toBe(1500);
    expect(b.currency).toBe('UAH');
  });

  it('minus зберігає знак від’ємного результату', () => {
    const b = Balance.of(new Money(1000, 'UAH')).minus(new Money(1500, 'UAH'));
    expect(b.amount).toBe(-500);
    expect(b.isNegative()).toBe(true);
  });

  it('нуль не вважається від’ємним', () => {
    expect(Balance.of(new Money(700, 'EUR')).minus(new Money(700, 'EUR')).isNegative()).toBe(false);
  });

  it('rejects minus with different currencies', () => {
    expect(() => Balance.of(new Money(100, 'UAH')).minus(new Money(100, 'EUR'))).toThrow();
  });

  it('rejects non-integer and unsafe amounts', () => {
    expect(() => new Balance(10.5, 'UAH')).toThrow();
    expect(() => new Balance(Number.NaN, 'UAH')).toThrow();
    expect(() => new Balance(Number.POSITIVE_INFINITY, 'UAH')).toThrow();
    expect(() => new Balance(2 ** 53, 'UAH')).toThrow();
  });

  it('accepts negative integers', () => {
    expect(new Balance(-7, 'UAH').amount).toBe(-7);
  });

  it('property: of(a).minus(b).amount === a - b без похибки', () => {
    const rnd = lcg(42);
    for (let i = 0; i < 1000; i++) {
      const a = Math.floor(rnd() * 1e12);
      const b = Math.floor(rnd() * 1e12);
      expect(Balance.of(new Money(a, 'UAH')).minus(new Money(b, 'UAH')).amount).toBe(a - b);
    }
  });
});
