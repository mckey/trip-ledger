import { describe, expect, it } from 'vitest';
import { Money } from './Money';
import { InvalidRateError, Rate } from './Rate';

describe('Rate', () => {
  it.each([
    '0',
    '0.000000000',
    '-1.5',
    '1.1234567890',
    '1e-7',
    '00.5',
    '.5',
    '1.',
    ' 1.5',
    '',
    '1234567890.5', // ціла частина 10 цифр — контракт дозволяє ≤ 9 ([1-9][0-9]{0,8})
    '0.0000000001', // 10 знаків після крапки, тобто < 10⁻⁹ — не представне
  ])('rejects invalid rate string %j', (raw) => {
    expect(() => Rate.parse(raw)).toThrow(InvalidRateError);
  });

  it('accepts a 9-digit integer part (contract boundary)', () => {
    expect(Rate.parse('123456789.5').toNano()).toBe(123_456_789_500_000_000n);
  });

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

  it('rejects fromNano beyond the 9-digit integer-part contract, not only parse', () => {
    // 1_234_567_890.5 — та сама межа, яку parse відкидає рядком; fromNano мала б обходити її.
    expect(() => Rate.fromNano(1_234_567_890_500_000_000n)).toThrow(InvalidRateError);
    // Межа: рівно 9 дев'яток у цілій частині + 9 дев'яток дробової — ще представне.
    expect(() => Rate.fromNano(999_999_999_999_999_999n)).not.toThrow();
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

  it('throws instead of silently losing precision when amount × rate exceeds Number.MAX_SAFE_INTEGER', () => {
    const money = new Money(Number.MAX_SAFE_INTEGER, 'A'); // 2⁵³ − 1
    expect(() => Rate.parse('3').apply(money, 'B')).toThrow(
      'Money amount must be a non-negative safe integer of minor units',
    );
  });

  it('applies a rate with at most 1 minor unit of error (half-up)', () => {
    const SCALE = 1_000_000_000n;
    const AMOUNT_CAP = 1_000_000_000_000; // 10¹² — межа з AC-s1-4

    // xorshift32: попередній LCG (seed * 1_103_515_245) рахував у Number, де добуток вже
    // ~2⁶¹ — молодші біти seed губились, і `% 512` виродився в 24 значення (887/2000 нулів,
    // жодної суми < 10⁶ серед 2000 пар). xorshift32 тримає повну 32-бітну ентропію в кожному
    // виклику й не потребує BigInt.
    let state = 0x5eed_7005 >>> 0;
    const nextU32 = (): number => {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      state >>>= 0;
      return state;
    };
    const nextFloat = (): number => nextU32() / 2 ** 32;

    let sawSmall = false; // < 1000
    let sawLarge = false; // > 10¹¹

    for (let i = 0; i < 2000; i++) {
      // Випадковий порядок величини 10⁰..10¹², щоб не пропустити ні малі, ні великі суми.
      const magnitude = nextU32() % 13;
      const bandStart = 10 ** magnitude;
      const amount = Math.min(Math.floor(bandStart + nextFloat() * bandStart * 9), AMOUNT_CAP);

      const nano = BigInt(1 + (nextU32() % 999_999_999)) + BigInt(nextU32() % 1000) * SCALE;
      const rate = Rate.fromNano(nano);
      const got = BigInt(rate.apply(new Money(amount, 'A'), 'B').amount);
      const exactTimesScale = BigInt(amount) * nano;
      const diff = got * SCALE - exactTimesScale;
      expect(diff <= SCALE && diff >= -SCALE).toBe(true);
      expect(got).toBe((exactTimesScale + SCALE / 2n) / SCALE);

      if (amount < 1000) sawSmall = true;
      if (amount > 100_000_000_000) sawLarge = true;
    }

    // Захист від тихої деградації генератора (саме так пропустили F1 минулого разу).
    expect(sawSmall).toBe(true);
    expect(sawLarge).toBe(true);
  });
});
