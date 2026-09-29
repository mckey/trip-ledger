// Приймальний зонд SHR-1 для фонової сесії (урок 7.5): AC story, переписані в тести до старту.
// Агент цей файл не змінює — умова /goal вимагає порожнього `git diff <base SHA> -- background/`.
import { describe, expect, it } from 'vitest';
import { Money } from '../../src/shared/Money';
import { InvalidRateError, Rate } from '../../src/shared/Rate';

const SCALE = 1_000_000_000n;

describe('SHR-1 acceptance: Rate value object', () => {
  it.each(['0', '0.000000000', '-1.5', '1.1234567890', '1e-7', '00.5', '.5', '1.', ' 1.5', ''])(
    'AC-s1-1: Rate.parse(%j) кидає InvalidRateError',
    (raw) => {
      expect(() => Rate.parse(raw)).toThrow(InvalidRateError);
    },
  );

  it('AC-s1-2: "0.9123" → toString "0.912300000", nano 912300000n', () => {
    const rate = Rate.parse('0.9123');
    expect(rate.toString()).toBe('0.912300000');
    expect(rate.toNano()).toBe(912_300_000n);
  });

  it('toNano/fromNano — round-trip, ONE = 1.000000000, fromNano(0n) кидає', () => {
    expect(Rate.fromNano(Rate.parse('26.5').toNano()).toString()).toBe('26.500000000');
    expect(Rate.ONE.toString()).toBe('1.000000000');
    expect(() => Rate.fromNano(0n)).toThrow(InvalidRateError);
  });

  it('AC-s1-3: 100 000 000 VND × 0.000037037 → 3704 EUR, не нуль', () => {
    const result = Rate.parse('0.000037037').apply(new Money(100_000_000, 'VND'), 'EUR');
    expect(result).toBeInstanceOf(Money);
    expect(result.amount).toBe(3704);
    expect(result.currency).toBe('EUR');
  });

  it('half-up на межі: 1 × 0.5 → 1, 1 × 0.499999999 → 0, 1999 × 0.9123 → 1824', () => {
    expect(Rate.parse('0.5').apply(new Money(1, 'A'), 'B').amount).toBe(1);
    expect(Rate.parse('0.499999999').apply(new Money(1, 'A'), 'B').amount).toBe(0);
    expect(Rate.parse('0.9123').apply(new Money(1999, 'A'), 'B').amount).toBe(1824);
  });

  it('AC-s1-4: 2000 випадкових пар — |похибка| ≤ 1 minor unit і округлення half-up', () => {
    let seed = 0x5eed_7005;
    const next = () => {
      seed = (seed * 1_103_515_245 + 12_345) % 2 ** 31;
      return seed;
    };
    for (let i = 0; i < 2000; i++) {
      const amount = (next() * 2 ** 9 + (next() % 512)) % 1_000_000_000_001;
      const nano = BigInt(1 + (next() % 999_999_999)) + BigInt(next() % 1000) * SCALE;
      const rate = Rate.fromNano(nano);
      const got = BigInt(rate.apply(new Money(amount, 'A'), 'B').amount);
      const exactTimesScale = BigInt(amount) * nano; // точний добуток × 10⁹
      const diff = got * SCALE - exactTimesScale; // (результат − точний) × 10⁹
      expect(diff <= SCALE && diff >= -SCALE).toBe(true);
      // half-up: результат = floor(точний + 0.5)
      expect(got).toBe((exactTimesScale + SCALE / 2n) / SCALE);
    }
  });
});
