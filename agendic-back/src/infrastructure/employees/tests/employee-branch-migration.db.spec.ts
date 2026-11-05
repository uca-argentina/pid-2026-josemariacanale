import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from 'pg';

/**
 * Runs the migration that ubica a los Empleados en Sucursales against the real Postgres, inside a scratch schema
 * created in a transaction that is rolled back at the end, so no real row or table is touched.
 */
describe('EmployeeBranch migration (real database)', () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  const migration = readFileSync(
    join(
      __dirname,
      '../../../../prisma/migrations/20261105000000_employee_branch/migration.sql',
    ),
    'utf8',
  );

  beforeAll(async () => {
    await client.connect();
    await client.query('BEGIN');
    await client.query('CREATE SCHEMA employee_branch_test');
    // Every unqualified name in the migration resolves to the scratch schema, never to the real tables.
    await client.query('SET LOCAL search_path TO employee_branch_test');
    await client.query(`
      CREATE TABLE "Business" ("id" int PRIMARY KEY, "ownerId" int NOT NULL);
      CREATE TABLE "Branch" ("id" int PRIMARY KEY, "businessId" int NOT NULL);
      CREATE TABLE "Employee" ("id" int PRIMARY KEY, "userId" int NOT NULL, "businessId" int NOT NULL, "deletedAt" timestamptz);
      CREATE TABLE "Service" ("id" int PRIMARY KEY, "branchId" int, "deletedAt" timestamptz);
      CREATE TABLE "EmployeeService" ("employeeId" int NOT NULL, "serviceId" int NOT NULL);

      INSERT INTO "Business" VALUES (1, 1), (2, 9);
      INSERT INTO "Branch" VALUES (10, 1), (11, 1), (12, 1), (20, 2);
      INSERT INTO "Service" VALUES
        (100, 10, NULL), (101, 11, now()), (102, 12, NULL), (200, 20, NULL);
      INSERT INTO "Employee" VALUES
        (1, 1, 1, NULL),  -- the Dueño, Ofrece only in 10
        (2, 2, 1, NULL),  -- Ofrece in 10, and a Servicio dado de baja in 11
        (3, 3, 1, NULL),  -- Ofrece only a Servicio dado de baja
        (4, 4, 1, NULL),  -- Ofrece nothing
        (5, 5, 1, now()), -- dado de baja
        (6, 6, 2, NULL),  -- another Negocio, Ofrece nothing
        (7, 7, 1, NULL);  -- Ofrece in 10 and 12
      INSERT INTO "EmployeeService" VALUES
        (1, 100), (2, 100), (2, 101), (3, 101), (5, 100), (7, 100), (7, 102);
    `);
    await client.query(migration);
  });

  afterAll(async () => {
    await client.query('ROLLBACK');
    await client.end();
  });

  const branchesOf = async (employeeId: number) =>
    (
      await client.query<{ branchId: number }>(
        'SELECT "branchId" FROM "EmployeeBranch" WHERE "employeeId" = $1 ORDER BY "branchId"',
        [employeeId],
      )
    ).rows.map(({ branchId }) => branchId);

  it.each([
    ['the Dueño, in every Sucursal of the Negocio', 1, [10, 11, 12]],
    [
      'an Empleado, in the Sucursales of the Servicios not dados de baja they Ofrecen',
      2,
      [10],
    ],
    ['several Sucursales when they Ofrece in several', 7, [10, 12]],
    [
      'an Empleado who Ofrece only Servicios dados de baja, in every Sucursal',
      3,
      [10, 11, 12],
    ],
    ['an Empleado who Ofrece nothing, in every Sucursal', 4, [10, 11, 12]],
    ['an Empleado dado de baja, nowhere', 5, []],
    ['only Sucursales of the Empleado’s own Negocio', 6, [20]],
  ])('places %s', async (_, employeeId, branchIds) => {
    await expect(branchesOf(employeeId)).resolves.toEqual(branchIds);
  });

  const insertInSavepoint = async (
    employeeId: number,
    branchId: number,
    businessId: number,
  ) => {
    await client.query('SAVEPOINT attempt');
    try {
      await client.query(
        'INSERT INTO "EmployeeBranch" ("employeeId", "branchId", "businessId") VALUES ($1, $2, $3)',
        [employeeId, branchId, businessId],
      );
    } finally {
      await client.query('ROLLBACK TO SAVEPOINT attempt');
    }
  };

  it('rejects a Sucursal of another Negocio', async () => {
    await expect(insertInSavepoint(4, 20, 1)).rejects.toThrow(
      'EmployeeBranch_branchId_businessId_fkey',
    );
    await expect(insertInSavepoint(4, 20, 2)).rejects.toThrow(
      'EmployeeBranch_employeeId_businessId_fkey',
    );
  });
});
