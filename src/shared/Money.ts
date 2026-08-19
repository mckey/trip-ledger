// Спільний value object. Без бізнес-логіки контекстів.
export class Money {
  constructor(
    public readonly amount: number, // у мінорних одиницях (копійки/центи)
    public readonly currency: string, // ISO 4217, напр. 'UAH'
  ) {
    if (!Number.isInteger(amount) || amount < 0) {
      throw new Error('Money amount must be a non-negative integer of minor units');
    }
  }

  add(other: Money): Money {
    if (other.currency !== this.currency) {
      throw new Error('Cannot add money in different currencies');
    }
    return new Money(this.amount + other.amount, this.currency);
  }
}
