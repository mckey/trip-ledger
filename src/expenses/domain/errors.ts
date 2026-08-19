export class TripNotFoundError extends Error {
  constructor(tripId: string) {
    super(`Trip ${tripId} not found`);
  }
}

export class TripNotAcceptingExpensesError extends Error {
  constructor(tripId: string) {
    super(`Trip ${tripId} is not accepting expenses`);
  }
}
