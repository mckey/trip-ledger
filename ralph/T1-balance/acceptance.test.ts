// Приймальний зонд T1 для Ralph-циклу: DoD story, переписаний у тести до старту агента.
// Агент цей файл не змінює — check.sh звіряє ralph/ з базовою гілкою.
import { describe, expect, it } from 'vitest';
import { Money } from '../../src/shared/Money';
import { Balance } from '../../src/shared/Balance';

// Детермінований LCG: property-тест відтворюваний без fast-check.
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

describe('T1 acceptance: Balance', () => {
  it('of(Money) переносить суму і валюту', () => {
    const b = Balance.of(new Money(1500, 'UAH'));
    expect(b.amount).toBe(1500);
    expect(b.currency).toBe('UAH');
    expect(b.isNegative()).toBe(false);
  });

  it('minus зберігає знак від’ємного результату', () => {
    const b = Balance.of(new Money(1000, 'UAH')).minus(new Money(1500, 'UAH'));
    expect(b.amount).toBe(-500);
    expect(b.currency).toBe('UAH');
    expect(b.isNegative()).toBe(true);
  });

  it('нуль не вважається від’ємним', () => {
    expect(Balance.of(new Money(700, 'EUR')).minus(new Money(700, 'EUR')).isNegative()).toBe(false);
  });

  it('minus з іншою валютою кидає помилку', () => {
    expect(() => Balance.of(new Money(100, 'UAH')).minus(new Money(100, 'EUR'))).toThrow();
  });

  it('minus не мутує вихідний Balance', () => {
    const start = Balance.of(new Money(1000, 'UAH'));
    start.minus(new Money(300, 'UAH'));
    expect(start.amount).toBe(1000);
  });

  it('конструктор приймає від’ємні цілі й відкидає нецілі та небезпечні', () => {
    expect(new Balance(-7, 'UAH').amount).toBe(-7);
    for (const bad of [10.5, -0.1, Number.NaN, Number.POSITIVE_INFINITY, 2 ** 53]) {
      expect(() => new Balance(bad, 'UAH')).toThrow();
    }
  });

  it('property: of(a).minus(b).amount === a - b без похибки', () => {
    const rnd = lcg(20260929);
    for (let i = 0; i < 1000; i++) {
      const a = Math.floor(rnd() * 1e12);
      const b = Math.floor(rnd() * 1e12);
      expect(Balance.of(new Money(a, 'UAH')).minus(new Money(b, 'UAH')).amount).toBe(a - b);
    }
  });
});
