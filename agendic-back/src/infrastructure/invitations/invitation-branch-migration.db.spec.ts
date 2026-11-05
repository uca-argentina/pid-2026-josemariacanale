import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from 'pg';

/**
 * Runs the migration that makes an Invitación llevar Sucursales against the real Postgres, inside a scratch schema
 * created in a transaction that is rolled back at the end, so no real row or table is touched.
 */
describe('InvitationBranch migration (real database)', () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  const migration = readFileSync(
    join(
      __dirname,
      '../../../prisma/migrations/20261105000200_invitation_branch/migration.sql',
    ),
    'utf8',
  );

  beforeAll(async () => {
    await client.connect();
    await client.query('BEGIN');
    await client.query('CREATE SCHEMA invitation_branch_test');
    // Every unqualified name in the migration resolves to the scratch schema, never to the real tables.
    await client.query('SET LOCAL search_path TO invitation_branch_test');
    await client.query(`
      CREATE TABLE "Branch" ("id" int PRIMARY KEY, "businessId" int NOT NULL, UNIQUE ("id", "businessId"));
      CREATE TABLE "Invitation" ("id" int PRIMARY KEY, "businessId" int NOT NULL, "expiresAt" timestamptz NOT NULL, "closedAt" timestamptz);

      INSERT INTO "Branch" VALUES (10, 1), (11, 1), (20, 2);
      INSERT INTO "Invitation" VALUES
        (1, 1, now() + interval '3 days', NULL),   -- pending
        (2, 2, now() + interval '3 days', NULL),   -- pending, another Negocio
        (3, 1, now() - interval '3 days', NULL),   -- expired but not closed: resend renews it
        (4, 1, now() + interval '3 days', now());  -- already accepted or rejected
    `);
    await client.query(migration);
  });

  afterAll(async () => {
    await client.query('ROLLBACK');
    await client.end();
  });

  const branchesOf = async (invitationId: number) =>
    (
      await client.query<{ branchId: number }>(
        'SELECT "branchId" FROM "InvitationBranch" WHERE "invitationId" = $1 ORDER BY "branchId"',
        [invitationId],
      )
    ).rows.map(({ branchId }) => branchId);

  it.each([
    ['a pending Invitación, in every Sucursal of its Negocio', 1, [10, 11]],
    ['only Sucursales of the Invitación’s own Negocio', 2, [20]],
    ['an expired, unclosed Invitación, in every Sucursal', 3, [10, 11]],
    ['an Invitación already closed, nowhere', 4, []],
  ])('places %s', async (_, invitationId, branchIds) => {
    await expect(branchesOf(invitationId)).resolves.toEqual(branchIds);
  });

  it('rejects a Sucursal of another Negocio', async () => {
    await client.query('SAVEPOINT attempt');
    try {
      await expect(
        client.query(
          'INSERT INTO "InvitationBranch" ("invitationId", "branchId", "businessId") VALUES (1, 20, 1)',
        ),
      ).rejects.toThrow('InvitationBranch_branchId_businessId_fkey');
    } finally {
      await client.query('ROLLBACK TO SAVEPOINT attempt');
    }
  });
});
