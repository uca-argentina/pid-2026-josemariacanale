// Datos de prueba de #382 (Sucursales con Ubicación) en el Negocio del Usuario 1 (Francisco, Dueño de "Masajes mimosos").
// Sucursales nuevas:
//  - "QA 382 Palermo" y "QA 382 Rosario": con punto en el mapa. Para el mapa del Cliente y "Usar mi ubicación".
//  - "QA 382 Córdoba (sin punto)": sin latitud/longitud, como las que falló geocodificar. No sale en el mapa; el panel pide completarla.
// Empleados de prueba (Usuarios falsos: no se loguean, sirven para ver el Staff):
//  - Ana: trabaja solo en Palermo.   - Beto: trabaja en Palermo y Rosario.
// Servicios: "Masaje Palermo" (Ana y Beto), "Corte Palermo" (solo Ana: sacarla de Palermo se bloquea por ser la última),
//            "Masaje Rosario" (solo Beto: lo mismo), "Servicio Córdoba" (nadie).
// Turnos futuros de Ana y Beto, para la vista previa al sacar un Empleado de una Sucursal.
// El Dueño (Empleado del Usuario 1) queda trabajando en todas las Sucursales nuevas.
// Idempotente: borra y recrea. Se corre desde agendic-back/ con `node .scratch/sucursales-qa/seed.mjs`.
import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import pg from 'pg';

const OWNER = 1;
const TZ = 'America/Argentina/Buenos_Aires';
const OFFSET_HOURS = 3; // Buenos Aires (UTC-3, sin horario de verano)
const day = (n) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
const at = (date, hour) => {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, hour + OFFSET_HOURS));
};

execFileSync('node', ['.scratch/sucursales-qa/teardown.mjs'], { stdio: 'inherit' });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const db = await pool.connect();
const one = async (sql, params) => (await db.query(sql, params)).rows[0].id;

try {
  await db.query('BEGIN');
  const business = await one(`SELECT id FROM "Business" WHERE "ownerId" = $1 AND "deletedAt" IS NULL`, [OWNER]);
  const ownerEmployee = await one(`SELECT id FROM "Employee" WHERE "userId" = $1 AND "businessId" = $2 AND "deletedAt" IS NULL`, [OWNER, business]);

  const branch = (name, slug, address, lat, lng) =>
    one(
      `INSERT INTO "Branch" ("businessId", name, address, "timeZone", slug, latitude, longitude) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [business, name, address, TZ, slug, lat, lng],
    );
  const palermo = await branch('QA 382 Palermo', 'qa-382-palermo', 'Av. Santa Fe 3253, Buenos Aires, Argentina', -34.5889, -58.4106);
  const rosario = await branch('QA 382 Rosario', 'qa-382-rosario', 'Córdoba 1500, Rosario, Santa Fe, Argentina', -32.9468, -60.6393);
  const cordoba = await branch('QA 382 Córdoba (sin punto)', 'qa-382-cordoba', 'Obispo Trejo 300, Córdoba, Argentina', null, null);

  for (const b of [palermo, rosario, cordoba])
    await db.query(`INSERT INTO "EmployeeBranch" ("employeeId","branchId","businessId") VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`, [ownerEmployee, b, business]);

  const staff = async (key, name) => {
    const user = await one(`INSERT INTO "User" ("clerkId", name, email) VALUES ($1,$2,$3) RETURNING id`, [
      `qa-382-${key}`,
      name,
      `qa-382-${key}@example.com`,
    ]);
    const employee = await one(`INSERT INTO "Employee" ("userId","businessId") VALUES ($1,$2) RETURNING id`, [user, business]);
    const availability = await one(
      `INSERT INTO "Availability" ("userId", name, "timeZone", "isDefault") VALUES ($1,'QA 382 09-18',$2,true) RETURNING id`,
      [user, TZ],
    );
    await db.query(
      `INSERT INTO "AvailabilityInterval" ("availabilityId", days, "startTime", "endTime") VALUES ($1, '{0,1,2,3,4,5,6}', '09:00'::time, '18:00'::time)`,
      [availability],
    );
    return { user, employee, availability };
  };
  const ana = await staff('ana', 'QA Ana (Palermo)');
  const beto = await staff('beto', 'QA Beto (Palermo y Rosario)');
  for (const [who, branches] of [[ana, [palermo]], [beto, [palermo, rosario]]])
    for (const b of branches)
      await db.query(`INSERT INTO "EmployeeBranch" ("employeeId","branchId","businessId") VALUES ($1,$2,$3)`, [who.employee, b, business]);

  const service = (branchId, name, slug) =>
    one(
      `INSERT INTO "Service" ("branchId", name, category, "durationMinutes", price, slug, "slotInterval") VALUES ($1,$2,'SPA',60,1000,$3,60) RETURNING id`,
      [branchId, name, slug],
    );
  const offer = (who, serviceId) =>
    db.query(`INSERT INTO "EmployeeService" ("employeeId","serviceId","availabilityId") VALUES ($1,$2,$3)`, [who.employee, serviceId, who.availability]);

  const masajePalermo = await service(palermo, 'QA 382 Masaje Palermo', 'qa-382-masaje-palermo');
  const cortePalermo = await service(palermo, 'QA 382 Corte Palermo', 'qa-382-corte-palermo');
  const masajeRosario = await service(rosario, 'QA 382 Masaje Rosario', 'qa-382-masaje-rosario');
  await service(cordoba, 'QA 382 Servicio Córdoba', 'qa-382-servicio-cordoba');
  await offer(ana, masajePalermo);
  await offer(beto, masajePalermo);
  await offer(ana, cortePalermo);
  await offer(beto, masajeRosario);

  const booking = async (who, serviceId, date, hour, clientName) => {
    const startsAt = at(date, hour);
    const id = await one(
      `INSERT INTO "Booking" ("serviceId","employeeId","userId","prepStartsAt","startsAt","endsAt",status,link,price,"acceptedAt")
       VALUES ($1,$2,$3,$4,$4,$5,'BOOKED',$6,1000,now()) RETURNING id`,
      [serviceId, who.employee, who.user, startsAt, at(date, hour + 1), randomBytes(24).toString('base64url')],
    );
    await db.query(`INSERT INTO "Client" ("bookingId", name, email) VALUES ($1,$2,$3)`, [id, clientName, `qa-382-${id}@example.com`]);
    return id;
  };
  await booking(ana, masajePalermo, day(2), 10, 'Cliente Uno');
  await booking(ana, cortePalermo, day(3), 11, 'Cliente Dos');
  await booking(beto, masajePalermo, day(4), 15, 'Cliente Tres');
  await booking(beto, masajeRosario, day(2), 16, 'Cliente Cuatro');
  await db.query('COMMIT');

  console.log('Seed OK en el Negocio "Masajes mimosos".');
  console.log('  Negocio (mapa, 3 puntos + Córdoba sin punto): /business/masajes-mimosos');
  console.log('  Palermo:  /business/masajes-mimosos/qa-382-palermo');
  console.log('  Rosario:  /business/masajes-mimosos/qa-382-rosario');
} catch (e) {
  await db.query('ROLLBACK');
  throw e;
} finally {
  db.release();
  await pool.end();
}
