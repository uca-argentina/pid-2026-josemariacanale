// Datos de prueba de la Lista de espera sobre el Negocio "Spa Prueba 163" (id 68, Sucursal 58) y el Usuario 1.
// Idempotente: borra y recrea. Se corre desde agendic-back/ con `node .scratch/lista-de-espera-qa/seed.mjs`.
import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import pg from 'pg';

const BRANCH = 58;
const LAURA = { userId: 219, employeeId: 98 };
const MARCOS = { userId: 220, employeeId: 99 };
const FRANCISCO = { userId: 1 };
const OFFSET_HOURS = 3; // Buenos Aires (UTC-3, sin horario de verano)

// Primer día hábil (lun-vie) con al menos 3 días de margen, y el hábil siguiente.
const weekdays = [];
for (let n = 3; weekdays.length < 2; n++) {
  const d = new Date(Date.now() + n * 86_400_000);
  if (![0, 6].includes(d.getUTCDay())) weekdays.push(d.toISOString().slice(0, 10));
}
const [FULL_DAY, FREE_DAY] = weekdays;
const at = (date, hour) => {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, hour + OFFSET_HOURS));
};

execFileSync('node', ['.scratch/lista-de-espera-qa/teardown.mjs'], { stdio: 'inherit' });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const db = await pool.connect();
const one = async (sql, params) => (await db.query(sql, params)).rows[0].id;

const availability = async (userId, name, start, end) => {
  const id = await one(
    `INSERT INTO "Availability" ("userId", name, "timeZone", "isDefault") VALUES ($1, $2, 'America/Argentina/Buenos_Aires', false) RETURNING id`,
    [userId, name],
  );
  await db.query(
    `INSERT INTO "AvailabilityInterval" ("availabilityId", days, "startTime", "endTime") VALUES ($1, '{1,2,3,4,5}', $2::time, $3::time)`,
    [id, start, end],
  );
  return id;
};

const service = (name, slug, owner) =>
  one(
    `INSERT INTO "Service" ("branchId", "userId", "availabilityId", name, category, "durationMinutes", price, slug)
     VALUES ($1, $2, $3, $4, 'SPA', 60, 1000, $5) RETURNING id`,
    [owner.branchId ?? null, owner.userId ?? null, owner.availabilityId ?? null, name, slug],
  );

const booking = async (serviceId, who, date, name, email) => {
  const startsAt = at(date, 10);
  const endsAt = at(date, 11);
  const id = await one(
    `INSERT INTO "Booking" ("serviceId", "employeeId", "userId", "prepStartsAt", "startsAt", "endsAt", status, link, price)
     VALUES ($1, $2, $3, $4, $4, $5, 'BOOKED', $6, 1000) RETURNING id`,
    [serviceId, who.employeeId ?? null, who.userId, startsAt, endsAt, randomBytes(24).toString('base64url')],
  );
  await db.query(`INSERT INTO "Client" ("bookingId", name, email) VALUES ($1, $2, $3)`, [id, name, email]);
};

try {
  await db.query('BEGIN');
  const laura = await availability(LAURA.userId, 'QA Laura 10-11', '10:00', '11:00');
  const marcos = await availability(MARCOS.userId, 'QA Marcos 10-12', '10:00', '12:00');
  const francisco = await availability(FRANCISCO.userId, 'QA Francisco 10-11', '10:00', '11:00');

  // A: Laura (un solo horario, 10:00) y Marcos (10:00 y 11:00).
  const team = await service('QA Espera equipo', 'qa-espera-equipo', { branchId: BRANCH });
  await db.query(`INSERT INTO "EmployeeService" ("employeeId", "serviceId", "availabilityId") VALUES ($1, $3, $2), ($4, $3, $5)`, [
    LAURA.employeeId, laura, team, MARCOS.employeeId, marcos,
  ]);
  // B: solo Laura, un horario por día.
  const full = await service('QA Espera lleno', 'qa-espera-lleno', { branchId: BRANCH });
  await db.query(`INSERT INTO "EmployeeService" ("employeeId", "serviceId", "availabilityId") VALUES ($1, $2, $3)`, [
    LAURA.employeeId, full, laura,
  ]);
  // C: Servicio personal de Francisco, un horario por día.
  const personal = await service('QA Espera personal', 'qa-espera-personal', { userId: FRANCISCO.userId, availabilityId: francisco });

  // Un Turno de Laura a las 10:00 llena B y a Laura en A; uno de Francisco llena C.
  await booking(full, LAURA, FULL_DAY, 'Cliente Ocupado', 'ocupado@example.com');
  await booking(personal, FRANCISCO, FULL_DAY, 'Cliente Ocupado', 'ocupado@example.com');
  await db.query('COMMIT');

  console.log(`Seed OK. Día lleno: ${FULL_DAY}. Día con lugar: ${FREE_DAY}.`);
  console.log(`  Servicio del Negocio lleno: /seed-163-spa/centro/qa-espera-lleno`);
  console.log(`  Con Empleado elegido (Laura llena, Marcos libre): /seed-163-spa/centro/qa-espera-equipo/laura-spa`);
  console.log(`  Servicio personal lleno: /francisco/qa-espera-personal`);
} catch (e) {
  await db.query('ROLLBACK');
  throw e;
} finally {
  db.release();
  await pool.end();
}
