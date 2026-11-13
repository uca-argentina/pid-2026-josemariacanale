// Borra los datos de prueba del Calendario conectado (Servicios "QA Calendario ..." y su Availability), con los Turnos
// que se hayan reservado sobre ellos. No borra eventos en Google: los Turnos se Cancelan desde la app para eso.
// Se corre desde agendic-back/ con `node .scratch/calendario-qa/teardown.mjs`.
import 'dotenv/config';
import pg from 'pg';

const SLUGS = ['qa-calendario', 'qa-calendario-aprobacion', 'qa-calendario-serie'];
const AVAILABILITY = 'QA Calendario 09-18';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();
try {
  await client.query('BEGIN');
  const ids = (await client.query(`SELECT id FROM "Service" WHERE slug = ANY($1) AND "userId" = 1`, [SLUGS])).rows.map((r) => r.id);
  if (ids.length) {
    await client.query(`DELETE FROM "WaitlistEntry" WHERE "serviceId" = ANY($1)`, [ids]);
    await client.query(`DELETE FROM "BookingRating" WHERE "bookingId" IN (SELECT id FROM "Booking" WHERE "serviceId" = ANY($1))`, [ids]);
    await client.query(`DELETE FROM "BookingCalendarEvent" WHERE "bookingId" IN (SELECT id FROM "Booking" WHERE "serviceId" = ANY($1))`, [ids]);
    await client.query(`DELETE FROM "Booking" WHERE "serviceId" = ANY($1)`, [ids]); // Client cae en cascada
    await client.query(`DELETE FROM "Service" WHERE id = ANY($1)`, [ids]);
  }
  await client.query(`DELETE FROM "Availability" WHERE name = $1 AND "userId" = 1`, [AVAILABILITY]); // Franjas en cascada
  await client.query('COMMIT');
  console.log(`Teardown OK (${ids.length} Servicios borrados)`);
} catch (e) {
  await client.query('ROLLBACK');
  throw e;
} finally {
  client.release();
  await pool.end();
}
