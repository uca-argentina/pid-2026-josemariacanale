import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from 'pg';

/**
 * Runs the backfill and the CHECKs of the Motivo de cancelación migration against the real Postgres, on a temporary
 * `Booking` that dies with the session, so no real row is touched. The enum and the columns are created by hand on
 * the temporary table: a `CREATE TYPE` would leave a permanent type behind.
 */
describe('Booking acceptedAt and cancelledBy (real database)', () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  const sql = readFileSync(
    join(
      __dirname,
      '../../../../prisma/migrations/20261012050000_booking_accepted_cancelled_by/migration.sql',
    ),
    'utf8',
  );
  // Everything from the backfill on: the structure above it is Prisma's own.
  const checks = sql.slice(sql.indexOf('UPDATE "Booking"'));

  beforeAll(async () => {
    await client.connect();
    await client.query(`CREATE TEMP TABLE "Booking" (
      "id" serial,
      "status" text NOT NULL,
      "createdAt" timestamptz(3) NOT NULL DEFAULT now(),
      "acceptedAt" timestamptz(3),
      "cancelledBy" text,
      "cancellationReason" text
    )`);
    await client.query(`INSERT INTO "Booking" ("status", "createdAt") VALUES
      ('BOOKED', '2026-01-01T12:00:00Z'), ('PENDING', '2026-01-02T12:00:00Z'), ('CANCELLED', '2026-01-03T12:00:00Z')`);
    await client.query(checks);
  });

  afterAll(() => client.end());

  const insert = (status: string, cancelledBy: string | null, reason: string | null) =>
    client.query(
      'INSERT INTO "Booking" ("status", "cancelledBy", "cancellationReason") VALUES ($1, $2, $3)',
      [status, cancelledBy, reason],
    );

  it('backfills acceptedAt with createdAt in the BOOKED Turnos only', async () => {
    const { rows } = await client.query(
      'SELECT "status", "acceptedAt", "createdAt" FROM "Booking" WHERE "id" <= 3 ORDER BY "id"',
    );

    expect(rows[0].acceptedAt).toEqual(rows[0].createdAt);
    expect(rows[1].acceptedAt).toBeNull();
    expect(rows[2].acceptedAt).toBeNull();
  });

  it.each(['CANCELLED', 'REJECTED'])('accepts cancelledBy with a reason in a %s Turno', async (status) => {
    await insert(status, 'EMPLOYEE', 'Estoy enfermo');
    await insert(status, 'RETIREMENT', null);
  });

  it.each(['BOOKED', 'PENDING'])('rejects cancelledBy in a %s Turno', async (status) => {
    await expect(insert(status, 'CLIENT', null)).rejects.toThrow(
      'Booking_cancelledBy_only_cancelled_or_rejected',
    );
  });

  it('rejects a Motivo de cancelación without cancelledBy', async () => {
    await expect(insert('CANCELLED', null, 'Sin quién')).rejects.toThrow(
      'Booking_cancellationReason_needs_cancelledBy',
    );
  });
});
