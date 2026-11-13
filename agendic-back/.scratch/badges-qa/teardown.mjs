// Borra los datos de prueba de Insignias y Negocios (#418): Usuarios falsos "seed-418-*", el Negocio "QA Negocio Ajeno",
// el Servicio "QA Insignias" y todos los Turnos sobre él (también los de Francisco y el Empleado 457, que son reales).
// Los Niveles ganados de los Usuarios reales (1 y 222) se conservan; con `--reset-badges` se borran y se vuelven a ganar
// la próxima vez que se evalúan (sirve para ver el modal de celebración de nuevo).
// Se corre desde agendic-back/ con `node .scratch/badges-qa/teardown.mjs [--reset-badges]`.
import 'dotenv/config';
import pg from 'pg';

const REAL_USERS = [1, 222];
const resetBadges = process.argv.includes('--reset-badges');

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const db = await pool.connect();
try {
  await db.query('BEGIN');
  const services = (await db.query(`SELECT id FROM "Service" WHERE slug = 'qa-insignias' AND "branchId" = 1`)).rows.map((r) => r.id);
  const fakeUsers = (await db.query(`SELECT id FROM "User" WHERE "clerkId" LIKE 'seed-418-%'`)).rows.map((r) => r.id);
  const business = (await db.query(`SELECT id FROM "Business" WHERE slug = 'qa-negocio-ajeno'`)).rows.map((r) => r.id);

  if (services.length) {
    await db.query(`DELETE FROM "Booking" WHERE "serviceId" = ANY($1)`, [services]); // Client y BookingRating caen en cascada
    await db.query(`DELETE FROM "EmployeeService" WHERE "serviceId" = ANY($1)`, [services]);
    await db.query(`DELETE FROM "Service" WHERE id = ANY($1)`, [services]);
  }
  if (business.length) {
    await db.query(`DELETE FROM "Employee" WHERE "businessId" = ANY($1)`, [business]);
    await db.query(`DELETE FROM "Branch" WHERE "businessId" = ANY($1)`, [business]);
    await db.query(`DELETE FROM "BookingSlug" WHERE "businessId" = ANY($1)`, [business]);
    await db.query(`DELETE FROM "Business" WHERE id = ANY($1)`, [business]);
  }
  if (fakeUsers.length) {
    await db.query(`DELETE FROM "Employee" WHERE "userId" = ANY($1)`, [fakeUsers]);
    await db.query(`DELETE FROM "UserBadge" WHERE "userId" = ANY($1)`, [fakeUsers]);
    await db.query(`DELETE FROM "Availability" WHERE "userId" = ANY($1)`, [fakeUsers]); // Franjas en cascada
    await db.query(`DELETE FROM "User" WHERE id = ANY($1)`, [fakeUsers]);
  }
  if (resetBadges) await db.query(`DELETE FROM "UserBadge" WHERE "userId" = ANY($1)`, [REAL_USERS]);
  await db.query('COMMIT');
  console.log(`Teardown OK (${services.length} Servicio, ${fakeUsers.length} Usuarios falsos, ${business.length} Negocio${resetBadges ? ', Niveles de Francisco y 222 borrados' : ''})`);
} catch (e) {
  await db.query('ROLLBACK');
  throw e;
} finally {
  db.release();
  await pool.end();
}
