import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from 'pg';

/**
 * Runs the migration of la Lista de espera against the real Postgres, on temporary tables that die with the session,
 * so no real row is touched: a single live Anotación per email (ignoring case), Servicio and fecha (ADR 0004).
 */
describe('WaitlistEntry (real database)', () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  // A temp table can't take part in a permanent FK, so the table is made temporary and the FK statement dropped.
  const migration = readFileSync(
    join(__dirname, '../../../../prisma/migrations/20261014120000_waitlist_entry/migration.sql'),
    'utf8',
  )
    .replace('CREATE TABLE', 'CREATE TEMP TABLE')
    .split('\n')
    .filter((line) => !line.includes('FOREIGN KEY'))
    .join('\n');

  beforeAll(async () => {
    await client.connect();
    await client.query(migration);
  });

  beforeEach(() => client.query('DELETE FROM "WaitlistEntry"'));
  afterAll(() => client.end());

  let links = 0;
  const join_ = (email: string, serviceId = 1, date = '2026-01-02') =>
    client.query(
      'INSERT INTO "WaitlistEntry" ("serviceId", "date", "clientName", "email", "link") VALUES ($1, $2, $3, $4, $5)',
      [serviceId, date, 'Carla', email, `link-${links++}`],
    );

  it('rejects a second live Anotación of the same email, Servicio and fecha, ignoring case', async () => {
    await join_('carla@example.com');

    await expect(join_('Carla@Example.com')).rejects.toThrow(
      'WaitlistEntry_email_service_date_key',
    );
  });

  it('allows the same email in another Servicio or fecha', async () => {
    await join_('carla@example.com');

    await join_('carla@example.com', 2);
    await join_('carla@example.com', 1, '2026-01-03');
  });

  it('allows another Anotación after the first one Salió', async () => {
    await join_('carla@example.com');
    await client.query('UPDATE "WaitlistEntry" SET "leftAt" = now()');

    await join_('carla@example.com');
  });
});
