// Borra los datos de prueba de la Lista de espera (Servicios "QA Espera ..." y sus Availability). Se corre desde agendic-back/.
import 'dotenv/config';
import pg from 'pg';

const SLUGS = ['qa-espera-equipo', 'qa-espera-lleno', 'qa-espera-personal'];
const AVAILABILITIES = ['QA Laura 10-11', 'QA Marcos 10-12', 'QA Francisco 10-11'];

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();
try {
  await client.query('BEGIN');
  const ids = (await client.query(`SELECT id FROM "Service" WHERE slug = ANY($1)`, [SLUGS])).rows.map((r) => r.id);
  if (ids.length) {
    await client.query(`DELETE FROM "WaitlistEntry" WHERE "serviceId" = ANY($1)`, [ids]);
    await client.query(`DELETE FROM "BookingRating" WHERE "bookingId" IN (SELECT id FROM "Booking" WHERE "serviceId" = ANY($1))`, [ids]);
    await client.query(`DELETE FROM "Booking" WHERE "serviceId" = ANY($1)`, [ids]); // Client cae en cascada
    await client.query(`DELETE FROM "EmployeeService" WHERE "serviceId" = ANY($1)`, [ids]);
    await client.query(`DELETE FROM "Service" WHERE id = ANY($1)`, [ids]);
  }
  await client.query(`DELETE FROM "Availability" WHERE name = ANY($1)`, [AVAILABILITIES]); // Franjas en cascada
  await client.query('COMMIT');
  console.log(`Teardown OK (${ids.length} Servicios borrados)`);
} catch (e) {
  await client.query('ROLLBACK');
  throw e;
} finally {
  client.release();
  await pool.end();
}
