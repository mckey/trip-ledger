// Domain-сутність. Ніяких імпортів з application/infrastructure/presentation.

export class TripDoesNotExistError extends Error {
  constructor(tripId: string) {
    super(`Trip ${tripId} does not exist`);
    this.name = 'TripDoesNotExistError';
  }
}

export class BaseCurrencyLockedError extends Error {
  constructor(tripId: string, baseCurrency: string) {
    super(`Trip ${tripId} base currency ${baseCurrency} is locked by rated expenses`);
    this.name = 'BaseCurrencyLockedError';
  }
}

export class BudgetCurrencyMismatchError extends Error {
  constructor(baseCurrency: string, attemptedCurrency: string) {
    super(`Trip base currency is ${baseCurrency}, cannot set budget in ${attemptedCurrency}`);
    this.name = 'BudgetCurrencyMismatchError';
  }
}
