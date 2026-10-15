import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from 'pg';

/**
 * Runs the CHECK of the Causa de cancelación migration against the real Postgres, on a temporary `Booking` that dies
 * with the session, so no real row is touched. The enum and the column are created by hand on the temporary table: a
 * `CREATE TYPE` would leave a permanent type behind.
 */
describe('Booking cancellationCause (real database)', () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  const sql = readFileSync(
    join(
      __dirname,
      '../../../../prisma/migrations/20261014123759_booking_cancellation_cause/migration.sql',
    ),
    'utf8',
  );
  // Everything from the CHECK on: the structure above it is Prisma's own.
  const check = sql.slice(sql.indexOf('ALTER TABLE "Booking" ADD CONSTRAINT'));

  beforeAll(async () => {
    await client.connect();
    await client.query(`CREATE TEMP TABLE "Booking" (
      "id" serial,
      "status" text NOT NULL,
      "cancelledBy" text,
      "cancellationReason" text,
      "cancellationCause" text
    )`);
    await client.query(check);
  });

  afterAll(() => client.end());

  const insert = (
    status: string,
    cancelledBy: string | null,
    reason: string | null,
    cause: string | null,
  ) =>
    client.query(
      'INSERT INTO "Booking" ("status", "cancelledBy", "cancellationReason", "cancellationCause") VALUES ($1, $2, $3, $4)',
      [status, cancelledBy, reason, cause],
    );

  it.each(['OUT_OF_OFFICE', 'PUBLIC_HOLIDAY', 'SCHEDULE_CHANGE'])(
    'accepts %s in a Turno cancelled by the Empleado with a Motivo',
    async (cause) => {
      await insert('CANCELLED', 'EMPLOYEE', 'Cambió sus horarios.', cause);
    },
  );

  it('accepts a Turno without causa', async () => {
    await insert('BOOKED', null, null, null);
    await insert('CANCELLED', 'EMPLOYEE', 'Estoy enfermo', null);
  });

  it.each(['PENDING', 'BOOKED', 'REJECTED'])(
    'rejects a causa in a %s Turno',
    async (status) => {
      await expect(
        insert(status, 'EMPLOYEE', 'Motivo', 'OUT_OF_OFFICE'),
      ).rejects.toThrow('Booking_cancellationCause_only_with_reason');
    },
  );

  it.each(['CLIENT', 'RETIREMENT', null])(
    'rejects a causa with cancelledBy %s',
    async (actor) => {
      await expect(
        insert('CANCELLED', actor, 'Motivo', 'PUBLIC_HOLIDAY'),
      ).rejects.toThrow('Booking_cancellationCause_only_with_reason');
    },
  );

  it('rejects a causa without Motivo de cancelación', async () => {
    await expect(
      insert('CANCELLED', 'EMPLOYEE', null, 'SCHEDULE_CHANGE'),
    ).rejects.toThrow('Booking_cancellationCause_only_with_reason');
  });
});
