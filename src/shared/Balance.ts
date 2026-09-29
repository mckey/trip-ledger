import { Money } from './Money';

// Спільний value object. Без бізнес-логіки контекстів.
export class Balance {
  constructor(
    public readonly amount: number, // знакове ціле у мінорних одиницях
    public readonly currency: string, // ISO 4217, напр. 'UAH'
  ) {
    if (!Number.isSafeInteger(amount)) {
      throw new Error('Balance amount must be a safe integer of minor units');
    }
  }

  static of(money: Money): Balance {
    return new Balance(money.amount, money.currency);
  }

  minus(other: Money): Balance {
    if (other.currency !== this.currency) {
      throw new Error('Cannot subtract money in different currencies');
    }
    return new Balance(this.amount - other.amount, this.currency);
  }

  isNegative(): boolean {
    return this.amount < 0;
  }
}
