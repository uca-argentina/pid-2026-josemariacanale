import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from 'pg';

/**
 * Runs the migration of the Falta del Empleado against the real Postgres, on a temporary `Booking` that dies with the
 * session, so no real row is touched: Ausencia and Falta del Empleado exclude each other.
 */
describe('Booking_no_show_exclusive (real database)', () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  const migration = readFileSync(
    join(
      __dirname,
      '../../../../prisma/migrations/20261012010000_booking_employee_no_show/migration.sql',
    ),
    'utf8',
  );

  beforeAll(async () => {
    await client.connect();
    await client.query('CREATE TEMP TABLE "Booking" ("noShowAt" timestamptz(3))');
    await client.query(migration);
  });

  afterAll(() => client.end());

  const insert = (noShowAt: string | null, employeeNoShowAt: string | null) =>
    client.query('INSERT INTO "Booking" ("noShowAt", "employeeNoShowAt") VALUES ($1, $2)', [
      noShowAt,
      employeeNoShowAt,
    ]);

  it('accepts a Turno with neither mark, or with just one', async () => {
    await insert(null, null);
    await insert('2026-01-01T12:00:00Z', null);
    await insert(null, '2026-01-01T12:00:00Z');
  });

  it('rejects a Turno with both marks', async () => {
    await expect(insert('2026-01-01T12:00:00Z', '2026-01-01T12:00:00Z')).rejects.toThrow(
      'Booking_no_show_exclusive',
    );
  });
});
