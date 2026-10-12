import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from 'pg';

/**
 * Runs the migration of the Calificación against the real Postgres, on temporary tables that die with the session, so
 * no real row is touched: the score goes from 1 to 5 and a Turno has a single Calificación.
 */
describe('BookingRating (real database)', () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  // A temp table can't take part in a permanent FK, so the table is made temporary and the FK statement dropped.
  const migration = readFileSync(
    join(__dirname, '../../../../prisma/migrations/20261012030000_booking_rating/migration.sql'),
    'utf8',
  )
    .replace('CREATE TABLE', 'CREATE TEMP TABLE')
    .split('\n')
    .filter((line) => !line.includes('FOREIGN KEY'))
    .join('\n');

  beforeAll(async () => {
    await client.connect();
    await client.query('CREATE TEMP TABLE "Booking" ("id" serial PRIMARY KEY)');
    await client.query('INSERT INTO "Booking" DEFAULT VALUES');
    await client.query('INSERT INTO "Booking" DEFAULT VALUES');
    await client.query(migration);
  });

  afterAll(() => client.end());

  const rate = (bookingId: number, score: number) =>
    client.query('INSERT INTO "BookingRating" ("bookingId", "score") VALUES ($1, $2)', [
      bookingId,
      score,
    ]);

  it.each([1, 5])('accepts a score of %i', async (score) => {
    await client.query('DELETE FROM "BookingRating"');
    await rate(1, score);
  });

  it.each([0, 6])('rejects a score of %i', async (score) => {
    await expect(rate(2, score)).rejects.toThrow('BookingRating_score_range');
  });

  it('rejects a second Calificación for the same Turno', async () => {
    await client.query('DELETE FROM "BookingRating"');
    await rate(1, 3);
    await expect(rate(1, 4)).rejects.toThrow('BookingRating_bookingId_key');
  });
});
