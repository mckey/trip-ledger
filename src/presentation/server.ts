import { Pool } from 'pg';
import { PostgresTripRepository } from '../trips/infrastructure/PostgresTripRepository';
import { createApp } from './app';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const app = createApp({ trips: new PostgresTripRepository(pool) });

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(`trip-ledger listening on :${port}`);
});
