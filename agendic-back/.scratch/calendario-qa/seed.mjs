// Datos de prueba del Calendario conectado, sobre el Usuario 1 (Francisco, el que conecta Google). Servicios personales:
//  - "QA Calendario": 60', Tiempo de preparación 15', Intervalo 60', Aprobación manual no. Para Ocupados externos y eventos.
//  - "QA Calendario aprobación": Aprobación manual. El evento sale "(pendiente)" y el .ics TENTATIVE.
//  - "QA Calendario serie": se repite cada semana, hasta 4 Turnos. Un evento por Turno.
// Más un Turno aceptado ya existente, para ver que el job crea su Evento del Turno sin que nadie lo reserve.
// Idempotente: borra y recrea. Se corre desde agendic-back/ con `node .scratch/calendario-qa/seed.mjs`.
import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import pg from 'pg';

const USER = 1;
const OFFSET_HOURS = 3; // Buenos Aires (UTC-3, sin horario de verano)
const day = (n) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
const at = (date, hour) => {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, hour + OFFSET_HOURS));
};

execFileSync('node', ['.scratch/calendario-qa/teardown.mjs'], { stdio: 'inherit' });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const db = await pool.connect();
const one = async (sql, params) => (await db.query(sql, params)).rows[0].id;

const service = (name, slug, availabilityId, extra = {}) =>
  one(
    `INSERT INTO "Service" ("userId", "availabilityId", name, category, "durationMinutes", price, slug, "prepMinutes", "slotInterval", "requiresApproval", "repeatEveryWeeks", "repeatMaxBookings")
     VALUES ($1, $2, $3, 'SPA', 60, 1000, $4, $5, 60, $6, $7, $8) RETURNING id`,
    [USER, availabilityId, name, slug, extra.prep ?? 0, extra.approval ?? false, extra.repeatEvery ?? null, extra.repeatMax ?? null],
  );

try {
  await db.query('BEGIN');
  // Todos los días, 09:00 a 18:00: hay Horarios reservables mañana sea el día que sea.
  const availability = await one(
    `INSERT INTO "Availability" ("userId", name, "timeZone", "isDefault") VALUES ($1, 'QA Calendario 09-18', 'America/Argentina/Buenos_Aires', false) RETURNING id`,
    [USER],
  );
  await db.query(
    `INSERT INTO "AvailabilityInterval" ("availabilityId", days, "startTime", "endTime") VALUES ($1, '{0,1,2,3,4,5,6}', '09:00'::time, '18:00'::time)`,
    [availability],
  );

  const base = await service('QA Calendario', 'qa-calendario', availability, { prep: 15 });
  await service('QA Calendario aprobación', 'qa-calendario-aprobacion', availability, { approval: true });
  await service('QA Calendario serie', 'qa-calendario-serie', availability, { repeatEvery: 1, repeatMax: 4 });

  // Turno aceptado dentro de 3 días a las 15:00, sin Evento del Turno todavía.
  const startsAt = at(day(3), 15);
  const endsAt = at(day(3), 16);
  const booking = await one(
    `INSERT INTO "Booking" ("serviceId", "userId", "prepStartsAt", "startsAt", "endsAt", status, link, price, "acceptedAt")
     VALUES ($1, $2, $3, $3, $4, 'BOOKED', $5, 1000, now()) RETURNING id`,
    [base, USER, new Date(startsAt.getTime() - 15 * 60_000), endsAt, randomBytes(24).toString('base64url')],
  );
  await db.query(`INSERT INTO "Client" ("bookingId", name, email) VALUES ($1, 'Cliente Preexistente', 'preexistente@example.com')`, [booking]);
  await db.query('COMMIT');

  console.log(`Seed OK. Turno preexistente ${booking} el ${day(3)} a las 15:00 (Buenos Aires): su evento debería aparecer en Google en ~1 minuto.`);
  console.log('  Servicio base:          /francisco/qa-calendario');
  console.log('  Aprobación manual:      /francisco/qa-calendario-aprobacion');
  console.log('  Serie (cada semana x4): /francisco/qa-calendario-serie');
} catch (e) {
  await db.query('ROLLBACK');
  throw e;
} finally {
  db.release();
  await pool.end();
}
