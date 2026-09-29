// Спільний value object. Курс на дроті — рядок, у пам'яті — ціле (шкала 10⁹), у БД — BIGINT.
import { Money } from './Money';

const SCALE = 1_000_000_000n;
const PATTERN = /^(0|[1-9][0-9]*)(\.[0-9]{1,9})?$/;

export class InvalidRateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidRateError';
  }
}

export class Rate {
  private readonly nano: bigint;

  constructor(nano: bigint) {
    if (nano <= 0n) {
      throw new InvalidRateError('Rate must be a positive value');
    }
    this.nano = nano;
  }

  static readonly ONE: Rate = new Rate(SCALE);

  static parse(raw: string): Rate {
    const match = PATTERN.exec(raw);
    if (!match) {
      throw new InvalidRateError(`Invalid rate format: ${raw}`);
    }
    const [, intPart, decPart] = match;
    const decimals = (decPart ?? '').slice(1).padEnd(9, '0');
    return new Rate(BigInt(intPart) * SCALE + BigInt(decimals));
  }

  static fromNano(nano: bigint): Rate {
    return new Rate(nano);
  }

  toNano(): bigint {
    return this.nano;
  }

  toString(): string {
    const intPart = this.nano / SCALE;
    const decPart = this.nano % SCALE;
    return `${intPart}.${decPart.toString().padStart(9, '0')}`;
  }

  apply(money: Money, target: string): Money {
    const product = BigInt(money.amount) * this.nano + SCALE / 2n;
    const resultAmount = product / SCALE;
    return new Money(+resultAmount.toString(), target);
  }
}
