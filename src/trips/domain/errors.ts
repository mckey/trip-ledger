// Domain-сутність. Ніяких імпортів з application/infrastructure/presentation.

export class TripDoesNotExistError extends Error {
  constructor(tripId: string) {
    super(`Trip ${tripId} does not exist`);
    this.name = 'TripDoesNotExistError';
  }
}

export class BaseCurrencyLockedError extends Error {
  constructor(baseCurrency: string, attemptedCurrency: string) {
    super(`Trip base currency is ${baseCurrency} and locked by rated expenses, cannot change to ${attemptedCurrency}`);
    this.name = 'BaseCurrencyLockedError';
  }
}

export class BudgetCurrencyMismatchError extends Error {
  constructor(baseCurrency: string, attemptedCurrency: string) {
    super(`Trip base currency is ${baseCurrency}, cannot set budget in ${attemptedCurrency}`);
    this.name = 'BudgetCurrencyMismatchError';
  }
}
