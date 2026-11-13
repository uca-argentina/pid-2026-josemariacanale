// Datos de prueba de Insignias y Negocios (#418). Todos los Turnos son del pasado (nada llega a calendarios ni mails)
// y los Clientes son @example.com. Idempotente: borra y recrea. Desde agendic-back/: `node .scratch/badges-qa/seed.mjs`.
//
// Cuentas reales (Clerk): Francisco (Usuario 1, Dueño de "Masajes mimosos") y franbertani2000@uca.edu.ar (Usuario 222,
// Dueño de "Estudio Lider" y Empleado de "Masajes mimosos" y de "QA Negocio Ajeno").
//
//   Staff de "Masajes mimosos" (como Dueño, Francisco):
//     Valentina QA : 5 Insignias (oro/plata/bronce x3)        -> 3 medallas + "+2"; Sheet con las 5 grandes
//     Tomás QA     : 3 Insignias (bronce)                     -> 3 medallas, sin "+N"
//     Camila QA    : 1 Insignia (Primer Turno)                -> 1 medalla
//     Nico QA      : sin Insignias                            -> sin medallas ni huecos
//   Francisco: sube a plata en "Turnos atendidos" y gana bronce en "Cinco estrellas" -> 2 modales en fila al abrir la app.
//   222: gana "Primer Turno" -> 1 modal; el resto en curso.
//   Negocios de 222: Estudio Lider (Dueño), Masajes mimosos (Empleado, con Sucursal) y QA Negocio Ajeno (Empleado,
//   sin Sucursales -> aviso). Francisco tiene un solo Negocio -> abierto.
import 'dotenv/config';
import { execFileSync } from 'node:child_process';
import pg from 'pg';

const BUSINESS = 1;
const BRANCH = 1;
const FRANCISCO = { userId: 1, employeeId: 1 };
const EMPLOYEE_222 = { userId: 222, employeeId: 457 };
const OFFSET_HOURS = 3; // Buenos Aires (UTC-3)

const at = (daysAgo, hour) => {
  const d = new Date(Date.now() - daysAgo * 86_400_000);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), hour + OFFSET_HOURS));
};

execFileSync('node', ['.scratch/badges-qa/teardown.mjs'], { stdio: 'inherit' });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const db = await pool.connect();
const one = async (sql, params) => (await db.query(sql, params)).rows[0].id;

/**
 * Turnos de un Empleado. attended: pasados y atendidos (10:00 y 15:00); fiveStars de ellos con 5 estrellas y
 * `loyal` Clientes que vuelven 3 veces. Ausencia del Anfitrión, Reagendados y Cancelados en los días indicados.
 */
const bookingsOf = (key, p) => {
  const rows = [];
  const base = { employeeId: p.employeeId, userId: p.userId };
  for (let i = 0; i < p.attended; i++) {
    const startsAt = at(1 + Math.floor(i / 2), i % 2 ? 15 : 10);
    const loyal = i < p.loyal * 3;
    rows.push({
      ...base, startsAt, status: 'BOOKED',
      email: loyal ? `qa418-${key}-fiel-${Math.floor(i / 3)}@example.com` : `qa418-${key}-${i}@example.com`,
      score: i < p.fiveStars ? 5 : i < p.fiveStars + 3 ? 4 : null,
    });
  }
  for (const d of p.employeeNoShowDays ?? [])
    rows.push({ ...base, startsAt: at(d, 12), status: 'BOOKED', employeeNoShow: true, email: `qa418-${key}-ausente-${d}@example.com` });
  for (const d of p.rescheduledDays ?? [])
    rows.push({ ...base, startsAt: at(d, 12), status: 'CANCELLED', rescheduled: true, cancelledBy: 'CLIENT', email: `qa418-${key}-reag-${d}@example.com`, replacementAt: at(d - 1, 17) });
  for (const d of p.cancelledDays ?? [])
    rows.push({ ...base, startsAt: at(d, 13), status: 'CANCELLED', cancelledBy: d % 2 ? 'CLIENT' : 'EMPLOYEE', email: `qa418-${key}-cancel-${d}@example.com` });
  return rows;
};

let serviceId;
// Booking_no_overlap: un Usuario no puede tener dos Turnos PENDING/BOOKED solapados. Se corre cada Turno al primer
// hueco libre de 30 minutos, contando los Turnos reales que ya existen.
const busy = new Map();
const place = (userId, startsAt) => {
  const ranges = busy.get(userId) ?? [];
  busy.set(userId, ranges);
  let from = startsAt.getTime();
  while (ranges.some(([a, z]) => from < z && from + 30 * 60_000 > a)) from += 30 * 60_000;
  ranges.push([from, from + 30 * 60_000]);
  return new Date(from);
};
const insertBooking = async (b, extra = {}) => {
  if (b.status === 'BOOKED') b = { ...b, startsAt: place(b.userId, b.startsAt) };
  const endsAt = new Date(b.startsAt.getTime() + 30 * 60_000);
  const createdAt = new Date(b.startsAt.getTime() - 2 * 86_400_000);
  const cancelled = b.status === 'CANCELLED';
  const id = await one(
    `INSERT INTO "Booking" ("serviceId", "employeeId", "userId", "prepStartsAt", "startsAt", "endsAt", status, price, "acceptedAt", "createdAt",
       "employeeNoShowAt", rescheduled, "cancelledAt", "cancelledBy", "cancellationReason", "ratingRequestSentAt", "fromRescheduleId")
     VALUES ($1,$2,$3,$4,$4,$5,$6,1000,$7,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id`,
    [
      serviceId, b.employeeId, b.userId, b.startsAt, endsAt, b.status, createdAt,
      b.employeeNoShow ? endsAt : null, b.rescheduled ? true : null,
      cancelled ? new Date(b.startsAt.getTime() - 86_400_000) : null,
      cancelled ? b.cancelledBy : null, cancelled && !b.rescheduled ? 'Cancelado para la prueba' : null,
      b.status === 'BOOKED' ? new Date(endsAt.getTime() + 3_600_000) : null, extra.fromRescheduleId ?? null,
    ],
  );
  await db.query(`INSERT INTO "Client" ("bookingId", name, email) VALUES ($1, 'Cliente QA', $2)`, [id, b.email]);
  if (b.score) await db.query(`INSERT INTO "BookingRating" ("bookingId", score, "createdAt") VALUES ($1, $2, $3)`, [id, b.score, new Date(endsAt.getTime() + 7_200_000)]);
  return id;
};

const fakeEmployee = async (key, name) => {
  const userId = await one(
    `INSERT INTO "User" ("clerkId", name, email) VALUES ($1, $2, $3) RETURNING id`,
    [`seed-418-${key}`, name, `qa418-${key}@example.com`],
  );
  const availability = await one(`INSERT INTO "Availability" ("userId", name, "timeZone", "isDefault") VALUES ($1, 'Horas laborables', 'America/Argentina/Buenos_Aires', true) RETURNING id`, [userId]);
  await db.query(`INSERT INTO "AvailabilityInterval" ("availabilityId", days, "startTime", "endTime") VALUES ($1, '{0,1,2,3,4,5,6}', '09:00'::time, '18:00'::time)`, [availability]);
  const employeeId = await one(`INSERT INTO "Employee" ("userId", "businessId") VALUES ($1, $2) RETURNING id`, [userId, BUSINESS]);
  await db.query(`INSERT INTO "EmployeeService" ("employeeId", "serviceId", "availabilityId") VALUES ($1, $2, $3)`, [employeeId, serviceId, availability]);
  return { userId, employeeId };
};

try {
  await db.query('BEGIN');
  const existing = await db.query(
    `SELECT "userId", "prepStartsAt", "endsAt" FROM "Booking" WHERE "userId" = ANY($1) AND status IN ('PENDING', 'BOOKED')`,
    [[FRANCISCO.userId, EMPLOYEE_222.userId]],
  );
  for (const r of existing.rows) {
    const ranges = busy.get(r.userId) ?? [];
    busy.set(r.userId, ranges);
    ranges.push([r.prepStartsAt.getTime(), r.endsAt.getTime()]);
  }
  serviceId = await one(
    `INSERT INTO "Service" ("branchId", name, category, "durationMinutes", price, slug, hidden)
     VALUES ($1, 'QA Insignias', 'SPA', 30, 1000, 'qa-insignias', true) RETURNING id`,
    [BRANCH],
  );
  // Francisco y 222 atienden el Servicio con su Availability por defecto.
  for (const [employeeId, availabilityId] of [[FRANCISCO.employeeId, 1], [EMPLOYEE_222.employeeId, 184]])
    await db.query(`INSERT INTO "EmployeeService" ("employeeId", "serviceId", "availabilityId") VALUES ($1,$2,$3)`, [employeeId, serviceId, availabilityId]);

  const valentina = await fakeEmployee('valentina', 'Valentina QA');
  const tomas = await fakeEmployee('tomas', 'Tomás QA');
  const camila = await fakeEmployee('camila', 'Camila QA');
  await fakeEmployee('nico', 'Nico QA');

  const plan = [
    ['valentina', { ...valentina, attended: 120, fiveStars: 30, loyal: 12, employeeNoShowDays: [45], rescheduledDays: [5, 12], cancelledDays: [4, 9, 18] }],
    ['tomas', { ...tomas, attended: 12, fiveStars: 6, loyal: 0, employeeNoShowDays: [5], rescheduledDays: [8], cancelledDays: [3] }],
    ['camila', { ...camila, attended: 1, fiveStars: 0, loyal: 0, cancelledDays: [2] }],
    ['francisco', { ...FRANCISCO, attended: 45, fiveStars: 6, loyal: 4, employeeNoShowDays: [6], rescheduledDays: [7], cancelledDays: [2, 11] }],
    ['u222', { ...EMPLOYEE_222, attended: 5, fiveStars: 3, loyal: 0, cancelledDays: [3] }],
  ];
  let total = 0;
  for (const [key, p] of plan) {
    for (const b of bookingsOf(key, p)) {
      const id = await insertBooking(b);
      total++;
      if (b.replacementAt) {
        await insertBooking({ ...b, status: 'BOOKED', startsAt: b.replacementAt, rescheduled: undefined, cancelledBy: undefined, email: `qa-reag-nuevo-${id}@example.com`, score: null }, { fromRescheduleId: id });
        total++;
      }
    }
  }

  // Un Negocio ajeno donde 222 es Empleado sin ninguna Sucursal asignada (aviso "Todavía no atendés...").
  const owner = await one(`INSERT INTO "User" ("clerkId", name, email) VALUES ('seed-418-gaby', 'Gaby QA', 'qa418-gaby@example.com') RETURNING id`);
  const business = await one(`INSERT INTO "Business" (name, description, "ownerId", slug) VALUES ('QA Negocio Ajeno', 'Negocio de prueba donde 222 es Empleado sin Sucursales.', $1, 'qa-negocio-ajeno') RETURNING id`, [owner]);
  await db.query(`INSERT INTO "BookingSlug" (slug, "businessId") VALUES ('qa-negocio-ajeno', $1)`, [business]);
  await db.query(`INSERT INTO "Branch" ("businessId", name, address, "timeZone", slug) VALUES ($1, 'QA Sede', 'Av. Corrientes 1234, CABA', 'America/Argentina/Buenos_Aires', 'qa-sede')`, [business]);
  await db.query(`INSERT INTO "Employee" ("userId", "businessId") VALUES ($1, $2), ($3, $2)`, [owner, business, EMPLOYEE_222.userId]);

  await db.query('COMMIT');
  console.log(`Seed OK: ${total} Turnos, 4 Empleados falsos en "Masajes mimosos" y el Negocio "QA Negocio Ajeno".`);
} catch (e) {
  await db.query('ROLLBACK');
  throw e;
} finally {
  db.release();
  await pool.end();
}
