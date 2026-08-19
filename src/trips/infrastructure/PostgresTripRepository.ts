import { Pool } from 'pg';
import { Trip, TripRepository, TripStatus } from '../domain/Trip';

interface TripRow {
  id: string;
  title: string;
  country: string;
  starts_at: Date;
  ends_at: Date;
  status: TripStatus;
}

export class PostgresTripRepository implements TripRepository {
  constructor(private readonly pool: Pool) {}

  async save(trip: Trip): Promise<void> {
    await this.pool.query(
      `INSERT INTO trips (id, title, country, starts_at, ends_at, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE
       SET title = $2, country = $3, starts_at = $4, ends_at = $5, status = $6`,
      [trip.id, trip.title, trip.country, trip.startsAt, trip.endsAt, trip.status],
    );
  }

  async findById(id: string): Promise<Trip | null> {
    const res = await this.pool.query<TripRow>('SELECT * FROM trips WHERE id = $1', [id]);
    const row = res.rows[0];
    return row ? this.toDomain(row) : null;
  }

  async list(): Promise<Trip[]> {
    const res = await this.pool.query<TripRow>('SELECT * FROM trips ORDER BY starts_at');
    return res.rows.map((row) => this.toDomain(row));
  }

  private toDomain(row: TripRow): Trip {
    return new Trip(
      row.id,
      row.title,
      row.country,
      new Date(row.starts_at),
      new Date(row.ends_at),
      row.status,
    );
  }
}
