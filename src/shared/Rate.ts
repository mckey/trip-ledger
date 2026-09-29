// Спільний value object. Курс на дроті — рядок, у пам'яті — ціле (шкала 10⁹), у БД — BIGINT.
import { Money } from './Money';

const SCALE = 1_000_000_000n;
// Ціла частина: сам «0» (напр. «0.5») або 1–9 цифр без провідних нулів — дзеркалить
// схему `Rate` контракту: (0|[1-9][0-9]{0,8}).
const PATTERN = /^(0|[1-9][0-9]{0,8})(\.[0-9]{1,9})?$/;
// 10¹⁸ — верхня межа nano при цілій частині рівно 9 цифр (999999999.999999999 < 10¹⁸).
// Тримається тут (не лише в parse), щоб fromNano не міг обійти межу контракту.
const MAX_NANO = 1_000_000_000_000_000_000n;

export class InvalidRateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidRateError';
  }
}

export class Rate {
  private readonly nano: bigint;

  constructor(nano: bigint) {
    if (nano <= 0n || nano >= MAX_NANO) {
      throw new InvalidRateError('Rate must be a positive value with at most 9 integer digits');
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
    // Number(...) конвертує суму в мінорних одиницях, не курс (курс лишається BigInt до цього
    // рядка) — safe-integer межу перевіряє конструктор Money.
    return new Money(Number(resultAmount), target);
  }
}
