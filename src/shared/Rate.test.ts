import { describe, expect, it } from 'vitest';
import { Money } from './Money';
import { InvalidRateError, Rate } from './Rate';

describe('Rate', () => {
  it.each(['0', '0.000000000', '-1.5', '1.1234567890', '1e-7', '00.5', '.5', '1.', ' 1.5', ''])(
    'rejects invalid rate string %j',
    (raw) => {
      expect(() => Rate.parse(raw)).toThrow(InvalidRateError);
    },
  );

  it('parses a valid decimal rate and always formats with 9 decimals', () => {
    const rate = Rate.parse('0.9123');
    expect(rate.toString()).toBe('0.912300000');
    expect(rate.toNano()).toBe(912_300_000n);
  });

  it('round-trips through toNano/fromNano, and ONE is 1.000000000', () => {
    expect(Rate.fromNano(Rate.parse('26.5').toNano()).toString()).toBe('26.500000000');
    expect(Rate.ONE.toString()).toBe('1.000000000');
    expect(() => Rate.fromNano(0n)).toThrow(InvalidRateError);
    expect(() => Rate.fromNano(-1n)).toThrow(InvalidRateError);
  });

  it('applies a rate to Money without rounding to zero for small currencies', () => {
    const result = Rate.parse('0.000037037').apply(new Money(100_000_000, 'VND'), 'EUR');
    expect(result).toBeInstanceOf(Money);
    expect(result.amount).toBe(3704);
    expect(result.currency).toBe('EUR');
  });

  it('rounds half-up at the boundary', () => {
    expect(Rate.parse('0.5').apply(new Money(1, 'A'), 'B').amount).toBe(1);
    expect(Rate.parse('0.499999999').apply(new Money(1, 'A'), 'B').amount).toBe(0);
    expect(Rate.parse('0.9123').apply(new Money(1999, 'A'), 'B').amount).toBe(1824);
  });

  it('applies a rate with at most 1 minor unit of error (half-up)', () => {
    const SCALE = 1_000_000_000n;
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
      const exactTimesScale = BigInt(amount) * nano;
      const diff = got * SCALE - exactTimesScale;
      expect(diff <= SCALE && diff >= -SCALE).toBe(true);
      expect(got).toBe((exactTimesScale + SCALE / 2n) / SCALE);
    }
  });
});
