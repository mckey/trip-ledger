import { Pool } from 'pg';
import { PostgresTripRepository } from '../trips/infrastructure/PostgresTripRepository';
import { PostgresExpenseRepository } from '../expenses/infrastructure/PostgresExpenseRepository';
import { createApp } from './app';
import { startupBanner } from './banner';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const app = createApp({
  trips: new PostgresTripRepository(pool),
  expenses: new PostgresExpenseRepository(pool),
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(
    startupBanner({ version: process.env.npm_package_version ?? 'dev', port, env: process.env.NODE_ENV }),
  );
});
