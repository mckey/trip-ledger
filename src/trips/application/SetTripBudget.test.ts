import { describe, expect, it } from 'vitest';
import { Money } from '../../shared/Money';
import { Trip, TripRepository } from '../domain/Trip';
import { BudgetCurrencyMismatchError, TripDoesNotExistError } from '../domain/errors';
import { aTrip } from '../testing/aTrip';
import { SetTripBudget } from './SetTripBudget';

class InMemoryTripRepository implements TripRepository {
  private trips = new Map<string, Trip>();

  seed(trip: Trip): void {
    this.trips.set(trip.id, trip);
  }

  async save(trip: Trip): Promise<void> {
    this.trips.set(trip.id, trip);
  }

  async findById(id: string): Promise<Trip | null> {
    return this.trips.get(id) ?? null;
  }

  async list(): Promise<Trip[]> {
    return [...this.trips.values()];
  }
}

describe('SetTripBudget', () => {
  it('зберігає перше задання budget поїздки без попереднього budget (AC-01)', async () => {
    const repository = new InMemoryTripRepository();
    const trip = aTrip();
    repository.seed(trip);
    const useCase = new SetTripBudget(repository);

    const result = await useCase.execute({
      tripId: trip.id,
      budget: new Money(10000, 'EUR'),
    });

    expect(result.budget).toEqual(new Money(10000, 'EUR'));
    expect(result.baseCurrency).toBe('EUR');

    const saved = await repository.findById(trip.id);
    expect(saved?.budget).toEqual(new Money(10000, 'EUR'));
  });

  it('відхиляє budget в іншій валюті й не змінює стан поїздки (AC-02)', async () => {
    const repository = new InMemoryTripRepository();
    const trip = aTrip({ budget: new Money(10000, 'USD') });
    repository.seed(trip);
    const useCase = new SetTripBudget(repository);

    await expect(
      useCase.execute({ tripId: trip.id, budget: new Money(5000, 'EUR') }),
    ).rejects.toThrow(BudgetCurrencyMismatchError);

    const saved = await repository.findById(trip.id);
    expect(saved?.budget).toEqual(new Money(10000, 'USD'));
    expect(saved?.baseCurrency).toBe('USD');
  });

  it('перераховує remaining від нового значення при заміні budget, попереднє значення ніде не лишається (AC-07)', async () => {
    const repository = new InMemoryTripRepository();
    const trip = aTrip({ budget: new Money(10000, 'USD') });
    repository.seed(trip);
    const useCase = new SetTripBudget(repository);

    const result = await useCase.execute({
      tripId: trip.id,
      budget: new Money(20000, 'USD'),
    });

    expect(result.budget).toEqual(new Money(20000, 'USD'));

    const saved = await repository.findById(trip.id);
    expect(saved?.budget).toEqual(new Money(20000, 'USD'));
    expect(saved?.budget).not.toEqual(new Money(10000, 'USD'));
  });

  it('приймає budget у finished поїздці (AC-09)', async () => {
    const repository = new InMemoryTripRepository();
    const trip = aTrip({ status: 'finished' });
    repository.seed(trip);
    const useCase = new SetTripBudget(repository);

    const result = await useCase.execute({
      tripId: trip.id,
      budget: new Money(15000, 'PLN'),
    });

    expect(result.status).toBe('finished');
    expect(result.budget).toEqual(new Money(15000, 'PLN'));

    const saved = await repository.findById(trip.id);
    expect(saved?.budget).toEqual(new Money(15000, 'PLN'));
  });

  it('кидає TripDoesNotExistError для невідомої поїздки', async () => {
    const repository = new InMemoryTripRepository();
    const useCase = new SetTripBudget(repository);

    await expect(
      useCase.execute({ tripId: 'missing', budget: new Money(1000, 'EUR') }),
    ).rejects.toThrow(TripDoesNotExistError);
  });
});
