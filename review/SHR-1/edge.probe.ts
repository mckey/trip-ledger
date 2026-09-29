import { describe, expect, it } from 'vitest';
import { Rate, InvalidRateError } from '../../src/shared/Rate';
import { Money } from '../../src/shared/Money';

describe('SHR-1 edge probe (7.6, coordinator)', () => {
  it.each(['0', '-1.5', '1.1234567890', '1e-7', '00.5', '.5', '1234567890.5', '0.0000000001', ' 1.5', '1.5 ', '+1.5', '1.', '0.000000000'])('rejects %j', (s) => {
    expect(() => Rate.parse(s)).toThrow(InvalidRateError);
  });
  it('accepts 9-digit int part', () => expect(Rate.parse('999999999.999999999').toString()).toBe('999999999.999999999'));
  it('0.9123 shape', () => { const r = Rate.parse('0.9123'); expect(r.toString()).toBe('0.912300000'); expect(r.toNano()).toBe(912300000n); });
  it('VND→EUR', () => expect(Rate.parse('0.000037037').apply(new Money(100000000, 'VND'), 'EUR').amount).toBe(3704));
  it('half-up at .5', () => expect(Rate.parse('0.5').apply(new Money(1, 'X'), 'Y').amount).toBe(1));
  it('overflow throws', () => expect(() => Rate.parse('3').apply(new Money(Number.MAX_SAFE_INTEGER, 'X'), 'Y')).toThrow());
  it('Money rejects unsafe', () => expect(() => new Money(2 ** 53, 'X')).toThrow());
});
