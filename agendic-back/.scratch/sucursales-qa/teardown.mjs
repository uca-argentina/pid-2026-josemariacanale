// Borra los datos de prueba de #382 (Sucursales con Ubicación): todo lo que cuelga de las Sucursales con slug qa-382-*
// y los Usuarios falsos qa-382-*, con los Turnos que se hayan reservado sobre esos Servicios.
// Se corre desde agendic-back/ con `node .scratch/sucursales-qa/teardown.mjs`.
import 'dotenv/config';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const c = await pool.connect();
const ids = async (sql, params = []) => (await c.query(sql, params)).rows.map((r) => r.id);
try {
  await c.query('BEGIN');
  const branches = await ids(`SELECT id FROM "Branch" WHERE slug LIKE 'qa-382-%'`);
  const services = await ids(`SELECT id FROM "Service" WHERE "branchId" = ANY($1::int[])`, [branches]);
  const users = await ids(`SELECT id FROM "User" WHERE "clerkId" LIKE 'qa-382-%'`);
  const employees = await ids(`SELECT id FROM "Employee" WHERE "userId" = ANY($1::int[])`, [users]);
  const bookings = await ids(`SELECT id FROM "Booking" WHERE "serviceId" = ANY($1::int[])`, [services]);

  await c.query(`DELETE FROM "WaitlistEntry" WHERE "serviceId" = ANY($1::int[])`, [services]);
  await c.query(`DELETE FROM "BookingRating" WHERE "bookingId" = ANY($1::int[])`, [bookings]);
  await c.query(`DELETE FROM "BookingCalendarEvent" WHERE "bookingId" = ANY($1::int[])`, [bookings]);
  await c.query(`DELETE FROM "Booking" WHERE id = ANY($1::int[])`, [bookings]); // Client cae en cascada
  await c.query(`DELETE FROM "EmployeeService" WHERE "serviceId" = ANY($1::int[]) OR "employeeId" = ANY($2::int[])`, [services, employees]);
  await c.query(`DELETE FROM "Service" WHERE id = ANY($1::int[])`, [services]);
  await c.query(`DELETE FROM "InvitationBranch" WHERE "branchId" = ANY($1::int[])`, [branches]);
  await c.query(`DELETE FROM "EmployeeBranch" WHERE "branchId" = ANY($1::int[]) OR "employeeId" = ANY($2::int[])`, [branches, employees]);
  await c.query(`DELETE FROM "Cabin" WHERE "branchId" = ANY($1::int[])`, [branches]);
  await c.query(`DELETE FROM "Branch" WHERE id = ANY($1::int[])`, [branches]);
  await c.query(`DELETE FROM "Employee" WHERE id = ANY($1::int[])`, [employees]);
  await c.query(`DELETE FROM "Availability" WHERE "userId" = ANY($1::int[])`, [users]); // Franjas en cascada
  await c.query(`DELETE FROM "User" WHERE id = ANY($1::int[])`, [users]);
  await c.query('COMMIT');
  console.log(`Teardown OK (${branches.length} Sucursales, ${services.length} Servicios, ${employees.length} Empleados)`);
} catch (e) {
  await c.query('ROLLBACK');
  throw e;
} finally {
  c.release();
  await pool.end();
}
