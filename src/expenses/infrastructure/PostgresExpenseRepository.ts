import { Pool } from 'pg';
import { Expense, ExpenseCategory, ExpenseRepository } from '../domain/Expense';
import { Money } from '../../shared/Money';

interface ExpenseRow {
  id: string;
  trip_id: string;
  amount_minor: number;
  currency: string;
  category: ExpenseCategory;
  spent_at: Date;
}

export class PostgresExpenseRepository implements ExpenseRepository {
  constructor(private readonly pool: Pool) {}

  async save(expense: Expense): Promise<void> {
    await this.pool.query(
      `INSERT INTO expenses (id, trip_id, amount_minor, currency, category, spent_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE
       SET trip_id = $2, amount_minor = $3, currency = $4, category = $5, spent_at = $6`,
      [
        expense.id,
        expense.tripId,
        expense.amount.amount,
        expense.amount.currency,
        expense.category,
        expense.spentAt,
      ],
    );
  }

  async findByTrip(tripId: string): Promise<Expense[]> {
    const res = await this.pool.query<ExpenseRow>(
      'SELECT * FROM expenses WHERE trip_id = $1 ORDER BY spent_at',
      [tripId],
    );
    return res.rows.map((row) => this.toDomain(row));
  }

  private toDomain(row: ExpenseRow): Expense {
    return new Expense(
      row.id,
      row.trip_id,
      new Money(row.amount_minor, row.currency),
      row.category,
      new Date(row.spent_at),
    );
  }
}
