-- Borra TODO lo que cargó demo.sql, y nada más. Se corre entero en pgAdmin (F5).
--
-- Cómo reconoce lo suyo (no toca datos reales):
--   Usuarios falsos : clerkId 'demo-def-%'
--   Negocios        : slug 'demo-aurora' (solo si lo creó el script) y 'demo-clinica-norte'
--   Sucursales      : slug 'demo-%' dentro del Negocio de franbertani2000@gmail.com o de un Negocio demo
--   Servicios       : slug 'demo-%' en esas Sucursales o personales de franbertani2000@gmail.com
--   Clientes/Invit. : email 'demo.%@example.com'
--
-- ANTES de limpiar: si conectaste Google Calendar, desconectalo desde la app (Desconectar borra los eventos futuros de
-- tu calendario). Si no, al borrar los Turnos los eventos quedan sueltos en Google.
-- El Programa de Rachas personal del Usuario no se borra (solo sus Recompensas y Premios demo).

BEGIN;

DROP TABLE IF EXISTS _d_me, _d_users, _d_biz, _d_branch, _d_service, _d_rewards;

CREATE TEMP TABLE _d_me AS
  SELECT "id" FROM "User" WHERE lower("email") = 'franbertani2000@gmail.com' AND "deletedAt" IS NULL;
CREATE TEMP TABLE _d_users AS SELECT "id" FROM "User" WHERE "clerkId" LIKE 'demo-def-%';
CREATE TEMP TABLE _d_biz AS SELECT "id" FROM "Business" WHERE "slug" IN ('demo-aurora', 'demo-clinica-norte');
CREATE TEMP TABLE _d_branch AS
  SELECT "id" FROM "Branch"
  WHERE "slug" LIKE 'demo-%'
    AND "businessId" IN (
      SELECT "id" FROM "Business"
      WHERE "ownerId" IN (SELECT "id" FROM _d_me) OR "id" IN (SELECT "id" FROM _d_biz)
         OR "ownerId" IN (SELECT "id" FROM _d_users));
CREATE TEMP TABLE _d_service AS
  SELECT "id" FROM "Service"
  WHERE "slug" LIKE 'demo-%'
    AND ("branchId" IN (SELECT "id" FROM _d_branch) OR "userId" IN (SELECT "id" FROM _d_me));
CREATE TEMP TABLE _d_rewards AS
  SELECT "rewardId" AS "id" FROM "StreakPrize" WHERE "clientEmail" LIKE 'demo.%@example.com'
  UNION SELECT "id" FROM "StreakReward" WHERE "serviceId" IN (SELECT "id" FROM _d_service)
  UNION SELECT "id" FROM "StreakReward" WHERE "description" = 'Sesión de aromaterapia (demo)';

DELETE FROM "StreakPrize" WHERE "clientEmail" LIKE 'demo.%@example.com';
DELETE FROM "StreakReward" WHERE "id" IN (SELECT "id" FROM _d_rewards);

DELETE FROM "Booking" WHERE "serviceId" IN (SELECT "id" FROM _d_service) OR "userId" IN (SELECT "id" FROM _d_users);
DELETE FROM "EmployeeService"
  WHERE "serviceId" IN (SELECT "id" FROM _d_service)
     OR "employeeId" IN (SELECT "id" FROM "Employee" WHERE "userId" IN (SELECT "id" FROM _d_users));
DELETE FROM "Service" WHERE "id" IN (SELECT "id" FROM _d_service);

DELETE FROM "Invitation"
  WHERE "businessId" IN (SELECT "id" FROM _d_biz)
     OR lower("email") LIKE 'demo.%@example.com';
DELETE FROM "Employee" WHERE "userId" IN (SELECT "id" FROM _d_users) OR "businessId" IN (SELECT "id" FROM _d_biz);
DELETE FROM "Branch" WHERE "id" IN (SELECT "id" FROM _d_branch);
DELETE FROM "BookingSlug" WHERE "businessId" IN (SELECT "id" FROM _d_biz);
DELETE FROM "Business" WHERE "id" IN (SELECT "id" FROM _d_biz);

DELETE FROM "UserBadge" WHERE "userId" IN (SELECT "id" FROM _d_users);
DELETE FROM "Availability" WHERE "userId" IN (SELECT "id" FROM _d_users);
DELETE FROM "Availability" WHERE "userId" IN (SELECT "id" FROM _d_me) AND "name" = 'Demo 09-18';
DELETE FROM "User" WHERE "id" IN (SELECT "id" FROM _d_users);

COMMIT;

-- Debe dar todo 0:
SELECT (SELECT count(*) FROM "Service" WHERE "slug" LIKE 'demo-%') AS servicios,
       (SELECT count(*) FROM "Branch" WHERE "slug" LIKE 'demo-%') AS sucursales,
       (SELECT count(*) FROM "Client" WHERE "email" LIKE 'demo.%@example.com') AS clientes,
       (SELECT count(*) FROM "User" WHERE "clerkId" LIKE 'demo-def-%') AS usuarios_falsos;
