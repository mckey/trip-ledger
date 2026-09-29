import { Money } from '../../shared/Money';
import { Trip, TripStatus } from '../domain/Trip';

const TEST_TRIP_ID = '00000000-0000-7000-8000-000000000001';

export interface ATripOptions {
  budget?: Money;
  baseCurrency?: string;
  status?: TripStatus;
}

export function aTrip(options: ATripOptions = {}): Trip {
  const trip = new Trip(
    TEST_TRIP_ID,
    'Test Trip',
    'PT',
    new Date('2026-10-01'),
    new Date('2026-10-15'),
    options.status ?? 'planned',
  );

  if (options.baseCurrency !== undefined) {
    trip.baseCurrency = options.baseCurrency;
  }

  if (options.budget !== undefined) {
    trip.setBudget(options.budget, new Date());
  }

  return trip;
}
