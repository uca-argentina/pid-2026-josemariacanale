import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from 'pg';

/**
 * Runs the migration of the Ubicación de la Sucursal against the real Postgres, on a temporary "Branch" that dies with
 * the session, so no real row is touched: both coordinates or neither, each within its range.
 */
describe('Branch location (real database)', () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  const migration = readFileSync(
    join(
      __dirname,
      '../../../../prisma/migrations/20261103000000_branch_location/migration.sql',
    ),
    'utf8',
  );

  beforeAll(async () => {
    await client.connect();
    // The temp table shadows the real one in this session, so the migration's ALTERs land on it.
    await client.query('CREATE TEMP TABLE "Branch" ("id" serial PRIMARY KEY)');
    await client.query(migration);
  });

  afterAll(() => client.end());

  const insert = (latitude: number | null, longitude: number | null) =>
    client.query(
      'INSERT INTO "Branch" ("latitude", "longitude") VALUES ($1, $2)',
      [latitude, longitude],
    );

  it('accepts a Sucursal without a point, as the ones from before it existed', async () => {
    await insert(null, null);
  });

  it.each([
    [-34.6037, -58.3816],
    [90, 180],
    [-90, -180],
  ])('accepts the point (%d, %d)', async (latitude, longitude) => {
    await insert(latitude, longitude);
  });

  it.each([
    [-34.6, null],
    [null, -58.4],
  ])('rejects only one coordinate (%p, %p)', async (latitude, longitude) => {
    await expect(insert(latitude, longitude)).rejects.toThrow(
      'Branch_location_both_or_neither',
    );
  });

  it('rejects a latitude out of range', async () => {
    await expect(insert(90.5, 0)).rejects.toThrow('Branch_latitude_range');
  });

  it('rejects a longitude out of range', async () => {
    await expect(insert(0, -180.5)).rejects.toThrow('Branch_longitude_range');
  });
});
