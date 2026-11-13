-- Datos de demo (5 min) para guaita.franco@gmail.com en agendic.vschiaffino.com.
-- Se corre ENTERO en pgAdmin (Query Tool, F5). Si ya lo corriste antes, corré primero limpiar-guaita.sql. Convive con demo.sql (otro Usuario, prefijos distintos: demog).
-- Si algo falla a mitad: ejecutá ROLLBACK; y avisá el error (todo va en una transacción).
--
-- Qué carga (todo marcado con el prefijo "demo", se borra con limpiar-guaita.sql):
--
--  1) SUCURSALES / MAPA   5 Sucursales con punto en el mapa (Nueva Córdoba, Cerro, Mar del Plata, Salta, Tucumán) en el
--                         Negocio del Usuario (si no tiene uno, crea "Estudio Zen"). Cada una con Servicio e imagen.
--  2) INCORPORACIÓN       a) una Invitación PENDIENTE para tu email de "Centro Médico Sur" (otro Dueño, 2 Sucursales):
--                            la Aceptás en vivo y pasás a ser Empleado en esas Sucursales.
--                         b) tu Negocio ya tiene Staff (Lucas, Mica) y una Invitación pendiente a demog.nuevo@example.com.
--  3) GOOGLE CALENDAR     8 Turnos BOOKED futuros que atendés vos (6 personales + 2 de Sucursales). La conexión con
--                         Google NO se puede cargar por SQL (el token va cifrado): se conecta en vivo con OAuth desde
--                         la app. Al conectar, el job crea los 8 eventos en tu calendario en ~1 minuto.
--  4) GAMIFICATION        55 Turnos atendidos del pasado con Calificaciones, 10 Clientes fieles, Programa de Rachas
--                         activo con 3 Recompensas y Premios ya ganados. Al abrir la app salen los modales de
--                         Insignias nuevas (se evalúan en vivo). Lucas y Mica tienen medallas en el Staff.
--
-- Los Clientes son @example.com y todo Turno pasado trae ratingRequestSentAt: ningún job manda mail a una persona real.

BEGIN;

-- ---- Diagnóstico (mirá el resultado antes de seguir; si 'usuario' sale vacío, el script aborta) ---------------------
SELECT u."id" AS usuario, u."name", u."email",
       (SELECT b."name" FROM "Business" b WHERE b."ownerId" = u."id" AND b."deletedAt" IS NULL) AS negocio_propio
FROM "User" u WHERE lower(u."email") = 'guaita.franco@gmail.com' AND u."deletedAt" IS NULL;

-- ---- Helpers (viven solo en esta sesión) ------------------------------------------------------------------------
-- Primer hueco libre del Usuario desde p_start, de a 30 min (respeta Booking_no_overlap).
CREATE OR REPLACE FUNCTION pg_temp.demo_free_start(p_user int, p_start timestamptz, p_min int)
RETURNS timestamptz LANGUAGE plpgsql AS $fn$
DECLARE s timestamptz := p_start;
BEGIN
  WHILE EXISTS (
    SELECT 1 FROM "Booking" b
    WHERE b."userId" = p_user AND b."status" IN ('PENDING', 'BOOKED')
      AND tstzrange(b."prepStartsAt", b."endsAt", '[)') && tstzrange(s, s + make_interval(mins => p_min), '[)')
  ) LOOP
    s := s + interval '30 minutes';
  END LOOP;
  RETURN s;
END $fn$;

-- Turno BOOKED con su Cliente y, si p_score no es null, su Calificación. Devuelve el horario en que quedó.
CREATE OR REPLACE FUNCTION pg_temp.demo_add_booking(
  p_service int, p_employee int, p_user int, p_want timestamptz, p_min int, p_price numeric,
  p_name text, p_email text, p_score int, p_comment text)
RETURNS timestamptz LANGUAGE plpgsql AS $fn$
DECLARE s timestamptz; e timestamptz; created timestamptz; v_id int;
BEGIN
  s := pg_temp.demo_free_start(p_user, p_want, p_min);
  e := s + make_interval(mins => p_min);
  created := least(s - interval '3 days', now() - interval '1 hour');
  INSERT INTO "Booking" ("serviceId", "employeeId", "userId", "prepStartsAt", "startsAt", "endsAt", "status",
                         "link", "price", "acceptedAt", "createdAt", "ratingRequestSentAt")
  VALUES (p_service, p_employee, p_user, s, s, e, 'BOOKED',
          md5(random()::text || clock_timestamp()::text) || md5(random()::text), p_price, created, created,
          CASE WHEN e < now() THEN e + interval '1 hour' END)
  RETURNING "id" INTO v_id;
  INSERT INTO "Client" ("bookingId", "name", "email") VALUES (v_id, p_name, p_email);
  IF p_score IS NOT NULL THEN
    INSERT INTO "BookingRating" ("bookingId", "score", "comment", "createdAt")
    VALUES (v_id, p_score, p_comment, e + interval '2 hours');
  END IF;
  RETURN s;
END $fn$;

DROP TABLE IF EXISTS _db;
CREATE TEMP TABLE _db (slug text, branch_id int, service_id int);

-- ---- Carga ------------------------------------------------------------------------------------------------------
DO $$
DECLARE
  p_email constant text := 'guaita.franco@gmail.com';
  tz constant text := 'America/Argentina/Buenos_Aires';
  img constant text := 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=1200';

  v_user int; v_biz int; v_owner_emp int; v_av int; v_personal int;
  v_b record; v_branch int; v_svc int;
  v_fake int; v_fake_av int; v_ana record; v_beto record;
  v_norte_owner int; v_norte int; v_inv int; v_br int;
  v_prog int; v_r3 int; v_r5 int; v_r10 int;

  names text[] := ARRAY['Lucía Fernández','Martín Rossi','Sofía Benítez','Joaquín Peralta','Camila Ríos',
    'Nicolás Giménez','Valentina Sosa','Federico Molina','Julieta Acosta','Tomás Herrera'];
  singles text[] := ARRAY['Paula Medina','Diego Ortiz','Carolina Vega','Bruno Silva','Rocío Cabrera','Gonzalo Paz',
    'Milagros Romero','Leandro Díaz','Agustina Torres','Pablo Ledesma','Belén Castro','Matías Suárez'];
  good text[] := ARRAY['Excelente atención, muy puntual.','Súper recomendable, vuelvo seguro.',
    'Muy profesional y amable.','Todo impecable, ¡gracias!'];

  i int; k int; n int; w int; v_name text; v_mail text; v_start timestamptz;
  v_starts timestamptz[]; v_ends timestamptz[];
BEGIN
  SELECT "id" INTO v_user FROM "User" WHERE lower("email") = p_email AND "deletedAt" IS NULL;
  IF v_user IS NULL THEN RAISE EXCEPTION 'No hay un Usuario activo con email %: entrá una vez a la app con esa cuenta', p_email; END IF;

  -- Negocio del Usuario (o uno nuevo) y su Empleado de Dueño.
  SELECT "id" INTO v_biz FROM "Business" WHERE "ownerId" = v_user AND "deletedAt" IS NULL;
  IF v_biz IS NULL THEN
    INSERT INTO "Business" ("name", "description", "ownerId", "slug")
    VALUES ('Estudio Zen', 'Estudio de bienestar con sucursales en Córdoba, Mar del Plata, Salta y Tucumán.', v_user, 'demo-lumbre')
    RETURNING "id" INTO v_biz;
    INSERT INTO "BookingSlug" ("slug", "businessId") VALUES ('demo-lumbre', v_biz);
  END IF;
  SELECT "id" INTO v_owner_emp FROM "Employee" WHERE "userId" = v_user AND "businessId" = v_biz AND "deletedAt" IS NULL;
  IF v_owner_emp IS NULL THEN
    INSERT INTO "Employee" ("userId", "businessId") VALUES (v_user, v_biz) RETURNING "id" INTO v_owner_emp;
  END IF;

  -- Horas laborables de la demo: todos los días 09:00-18:00 (no es la predeterminada).
  INSERT INTO "Availability" ("userId", "name", "timeZone", "isDefault") VALUES (v_user, 'Demo 09-18', tz, false)
  RETURNING "id" INTO v_av;
  INSERT INTO "AvailabilityInterval" ("availabilityId", "days", "startTime", "endTime")
  VALUES (v_av, '{0,1,2,3,4,5,6}', '09:00'::time, '18:00'::time);

  -- ===== 1) Sucursales con Ubicación + un Servicio cada una =====
  FOR v_b IN SELECT * FROM (VALUES
      ('Zen Nueva Córdoba',   'demo-nueva-cordoba', 'Obispo Trejo 300, Nueva Córdoba, Córdoba, Argentina',     -31.4283::float8, -64.1835::float8),
      ('Zen Cerro',           'demo-cerro',         'Av. Rafael Núñez 4500, Cerro de las Rosas, Córdoba, Argentina', -31.3750::float8, -64.2300::float8),
      ('Zen Mar del Plata',   'demo-mar-del-plata', 'Av. Colón 2300, Mar del Plata, Buenos Aires, Argentina',  -38.0023::float8, -57.5575::float8),
      ('Zen Salta',           'demo-salta',         'Balcarce 800, Salta, Argentina',                         -24.7821::float8, -65.4232::float8),
      ('Zen Tucumán',         'demo-tucuman',       'Av. Sarmiento 600, San Miguel de Tucumán, Argentina',    -26.8083::float8, -65.2176::float8)
    ) AS t(name, slug, address, lat, lng)
  LOOP
    INSERT INTO "Branch" ("businessId", "name", "address", "timeZone", "slug", "latitude", "longitude")
    VALUES (v_biz, v_b.name, v_b.address, tz, v_b.slug, v_b.lat, v_b.lng) RETURNING "id" INTO v_branch;
    INSERT INTO "BranchImage" ("branchId", "url", "order") VALUES (v_branch, img, 0);
    INSERT INTO "EmployeeBranch" ("employeeId", "branchId", "businessId") VALUES (v_owner_emp, v_branch, v_biz);
    INSERT INTO "Service" ("branchId", "name", "description", "category", "durationMinutes", "price", "slug", "slotInterval")
    VALUES (v_branch, 'Masaje descontracturante', 'Sesión de 60 minutos para aliviar tensiones.', 'SPA', 60, 12000, 'demo-masaje', 60)
    RETURNING "id" INTO v_svc;
    INSERT INTO "EmployeeService" ("employeeId", "serviceId", "availabilityId") VALUES (v_owner_emp, v_svc, v_av);
    INSERT INTO _db VALUES (v_b.slug, v_branch, v_svc);
  END LOOP;

  -- ===== 2b) Staff de tu Negocio: Lucas (Nueva Córdoba y Cerro), Mica (Nueva Córdoba y Mar del Plata) =====
  FOR v_ana IN SELECT * FROM (VALUES ('ana', 'Lucas Ferrero', 'demo-nueva-cordoba', 'demo-cerro'),
                                      ('beto', 'Mica Soria', 'demo-nueva-cordoba', 'demo-mar-del-plata')) AS t(key, name, b1, b2)
  LOOP
    INSERT INTO "User" ("clerkId", "name", "email") VALUES ('demog-def-' || v_ana.key, v_ana.name, 'demog.' || v_ana.key || '@example.com')
    RETURNING "id" INTO v_fake;
    INSERT INTO "Availability" ("userId", "name", "timeZone", "isDefault") VALUES (v_fake, 'Horas laborables', tz, true)
    RETURNING "id" INTO v_fake_av;
    INSERT INTO "AvailabilityInterval" ("availabilityId", "days", "startTime", "endTime")
    VALUES (v_fake_av, '{0,1,2,3,4,5,6}', '09:00'::time, '18:00'::time);
    INSERT INTO "Employee" ("userId", "businessId") VALUES (v_fake, v_biz) RETURNING "id" INTO k;
    FOR v_br, v_svc IN SELECT branch_id, service_id FROM _db WHERE slug IN (v_ana.b1, v_ana.b2) LOOP
      INSERT INTO "EmployeeBranch" ("employeeId", "branchId", "businessId") VALUES (k, v_br, v_biz);
      INSERT INTO "EmployeeService" ("employeeId", "serviceId", "availabilityId") VALUES (k, v_svc, v_fake_av);
    END LOOP;
    -- Medallas en el Staff: Lucas 12 Turnos atendidos (5 con 5 estrellas), Mica 1.
    SELECT service_id INTO v_svc FROM _db WHERE slug = 'demo-nueva-cordoba';
    FOR i IN 1..(CASE WHEN v_ana.key = 'ana' THEN 12 ELSE 1 END) LOOP
      PERFORM pg_temp.demo_add_booking(v_svc, k, v_fake, ((current_date - i) + time '09:00') AT TIME ZONE tz, 60, 12000,
        'Cliente Demo ' || i, 'demog.' || v_ana.key || '.cliente' || i || '@example.com',
        CASE WHEN v_ana.key = 'ana' AND i <= 5 THEN 5 END, CASE WHEN v_ana.key = 'ana' AND i = 1 THEN good[1] END);
    END LOOP;
  END LOOP;

  -- Invitación pendiente de TU Negocio a un email nuevo, para dos Sucursales.
  INSERT INTO "Invitation" ("businessId", "email", "expiresAt") VALUES (v_biz, 'demog.nuevo@example.com', now() + interval '7 days')
  RETURNING "id" INTO v_inv;
  INSERT INTO "InvitationBranch" ("invitationId", "branchId", "businessId")
  SELECT v_inv, branch_id, v_biz FROM _db WHERE slug IN ('demo-nueva-cordoba', 'demo-cerro');

  -- ===== 2a) Invitación PENDIENTE a vos desde "Centro Médico Sur" (otro Dueño) =====
  INSERT INTO "User" ("clerkId", "name", "email") VALUES ('demog-def-sur', 'Ernesto Paz', 'demog.ernesto@example.com')
  RETURNING "id" INTO v_norte_owner;
  INSERT INTO "Business" ("name", "description", "ownerId", "slug")
  VALUES ('Centro Médico Sur', 'Centro médico de kinesiología y rehabilitación.', v_norte_owner, 'demo-centro-medico')
  RETURNING "id" INTO v_norte;
  INSERT INTO "BookingSlug" ("slug", "businessId") VALUES ('demo-centro-medico', v_norte);
  INSERT INTO "Employee" ("userId", "businessId") VALUES (v_norte_owner, v_norte);
  INSERT INTO "Invitation" ("businessId", "email", "expiresAt") VALUES (v_norte, p_email, now() + interval '7 days')
  RETURNING "id" INTO v_inv;
  FOR v_b IN SELECT * FROM (VALUES
      ('Sur Caballito', 'demo-caballito', 'Av. Rivadavia 5100, Caballito, Buenos Aires, Argentina', -34.6180::float8, -58.4430::float8),
      ('Sur Quilmes', 'demo-quilmes', 'Av. Hipólito Yrigoyen 500, Quilmes, Buenos Aires, Argentina', -34.7206::float8, -58.2546::float8)
    ) AS t(name, slug, address, lat, lng)
  LOOP
    INSERT INTO "Branch" ("businessId", "name", "address", "timeZone", "slug", "latitude", "longitude")
    VALUES (v_norte, v_b.name, v_b.address, tz, v_b.slug, v_b.lat, v_b.lng) RETURNING "id" INTO v_branch;
    INSERT INTO "BranchImage" ("branchId", "url", "order") VALUES (v_branch, img, 0);
    INSERT INTO "InvitationBranch" ("invitationId", "branchId", "businessId") VALUES (v_inv, v_branch, v_norte);
  END LOOP;

  -- ===== Servicio personal (Turnos del Usuario: Calendar + gamification) =====
  INSERT INTO "Service" ("userId", "availabilityId", "name", "description", "category", "durationMinutes", "price", "slug", "slotInterval")
  VALUES (v_user, v_av, 'Consulta personal', 'Sesión individual de 30 minutos.', 'OTRO', 30, 8000, 'demo-consulta', 30)
  RETURNING "id" INTO v_personal;

  -- ===== 4) Gamification: Programa de Rachas personal =====
  INSERT INTO "StreakProgram" ("userId", "burnAfterDays", "active") VALUES (v_user, 30, true)
  ON CONFLICT ("userId") DO UPDATE SET "burnAfterDays" = 30, "active" = true
  RETURNING "id" INTO v_prog;
  INSERT INTO "StreakReward" ("programId", "requiredCount", "repeatable", "type", "value", "validForDays")
  VALUES (v_prog, 3, false, 'PERCENT_DISCOUNT', 10, 60) RETURNING "id" INTO v_r3;
  INSERT INTO "StreakReward" ("programId", "requiredCount", "repeatable", "type", "description", "validForDays")
  VALUES (v_prog, 5, false, 'GIFT', 'Sesión de aromaterapia (demo G)', 60) RETURNING "id" INTO v_r5;
  INSERT INTO "StreakReward" ("programId", "requiredCount", "repeatable", "type", "serviceId", "validForDays")
  VALUES (v_prog, 10, false, 'FREE_SERVICE', v_personal, 90) RETURNING "id" INTO v_r10;

  -- 10 Clientes fieles, con Turnos semanales (dentro del Tiempo de quemada de 30 días): el 1.º llega a 6 seguidos,
  -- el 2.º a 4, el resto a 3. Calificaciones de 5: 6 + 4 + 2 = 12 (Cinco estrellas, bronce).
  FOR i IN 1..10 LOOP
    n := CASE i WHEN 1 THEN 6 WHEN 2 THEN 4 ELSE 3 END;
    v_name := names[i];
    v_mail := 'demog.' || translate(lower(replace(v_name, ' ', '.')), 'áéíóúñ', 'aeioun') || '@example.com';
    FOR k IN 1..n LOOP
      w := n - k + 1; -- semanas atrás: el último Turno fue hace 1 semana
      PERFORM pg_temp.demo_add_booking(v_personal, NULL, v_user,
        ((current_date - (7 * w + (i % 4))) + time '10:00' + make_interval(mins => (i - 1) * 30)) AT TIME ZONE tz,
        30, 8000, v_name, v_mail,
        CASE WHEN i <= 2 OR (i = 3 AND k <= 2) THEN 5 WHEN i = 4 AND k = 1 THEN 4 END,
        CASE WHEN k = 1 AND i <= 4 THEN good[1 + (i % 4)] END);
    END LOOP;
    -- Premios ya ganados (los mismos que otorgaría el job de Rachas, que no los repite).
    SELECT array_agg(b."startsAt" ORDER BY b."startsAt"), array_agg(b."endsAt" ORDER BY b."startsAt")
      INTO v_starts, v_ends
      FROM "Booking" b JOIN "Client" c ON c."bookingId" = b."id"
      WHERE b."serviceId" = v_personal AND c."email" = v_mail AND b."status" = 'BOOKED';
    INSERT INTO "StreakPrize" ("rewardId", "userId", "clientEmail", "streakStartedAt", "reachedCount", "type", "value",
                               "grantedAt", "expiresAt")
    VALUES (v_r3, v_user, v_mail, v_starts[1], 3, 'PERCENT_DISCOUNT', 10, v_ends[3], v_ends[3] + interval '60 days');
    IF n >= 5 THEN
      INSERT INTO "StreakPrize" ("rewardId", "userId", "clientEmail", "streakStartedAt", "reachedCount", "type",
                                 "description", "grantedAt", "expiresAt")
      VALUES (v_r5, v_user, v_mail, v_starts[1], 5, 'GIFT', 'Sesión de aromaterapia (demo G)', v_ends[5], v_ends[5] + interval '60 days');
    END IF;
  END LOOP;

  -- 21 Turnos sueltos atendidos (34 + 21 = 55 atendidos: Primer Turno, Turnos atendidos bronce y plata).
  FOR i IN 1..21 LOOP
    v_name := singles[1 + (i % 12)];
    v_mail := 'demog.' || translate(lower(replace(v_name, ' ', '.')), 'áéíóúñ', 'aeioun') || '.' || i || '@example.com';
    PERFORM pg_temp.demo_add_booking(v_personal, NULL, v_user,
      ((current_date - (1 + (i * 2) % 38)) + time '12:00' + make_interval(mins => (i % 6) * 30)) AT TIME ZONE tz,
      30, 8000, v_name, v_mail, NULL, NULL);
  END LOOP;

  -- ===== 3) Turnos futuros para sincronizar con Google Calendar =====
  FOR i, v_name, v_mail, k IN SELECT * FROM (VALUES
      (1, names[1], 'demog.lucia.fernandez@example.com', 10),   -- sigue la Racha de Lucía (la 7.ª)
      (2, 'Carlos Duarte',  'demog.carlos.duarte@example.com', 11),
      (3, 'Mariana Lopez',  'demog.mariana.lopez@example.com', 15),
      (4, 'Hernán Vidal',   'demog.hernan.vidal@example.com',  10),
      (6, 'Silvia Arce',    'demog.silvia.arce@example.com',   16),
      (8, 'Ramiro Quiroga', 'demog.ramiro.quiroga@example.com', 12)
    ) AS t(days, name, email, hour)
  LOOP
    PERFORM pg_temp.demo_add_booking(v_personal, NULL, v_user,
      ((current_date + i) + make_time(k, 0, 0)) AT TIME ZONE tz, 30, 8000, v_name, v_mail, NULL, NULL);
  END LOOP;
  -- Dos Turnos de Sucursal que atendés como Empleado.
  SELECT service_id INTO v_svc FROM _db WHERE slug = 'demo-nueva-cordoba';
  PERFORM pg_temp.demo_add_booking(v_svc, v_owner_emp, v_user, ((current_date + 2) + time '17:00') AT TIME ZONE tz, 60, 12000,
    'Julia Navarro', 'demog.julia.navarro@example.com', NULL, NULL);
  SELECT service_id INTO v_svc FROM _db WHERE slug = 'demo-cerro';
  PERFORM pg_temp.demo_add_booking(v_svc, v_owner_emp, v_user, ((current_date + 5) + time '11:00') AT TIME ZONE tz, 60, 12000,
    'Esteban Rojas', 'demog.esteban.rojas@example.com', NULL, NULL);

  RAISE NOTICE 'Listo. Usuario %, Negocio %, Servicio personal %', v_user, v_biz, v_personal;
END $$;

-- ---- Verificación (todavía dentro de la transacción) ------------------------------------------------------------
SELECT 'sucursales con punto' AS item, count(*) AS cantidad FROM "Branch" WHERE "slug" LIKE 'demo-%' AND "latitude" IS NOT NULL
UNION ALL SELECT 'invitaciones pendientes a vos', count(*) FROM "Invitation"
  WHERE lower("email") = 'guaita.franco@gmail.com' AND "closedAt" IS NULL AND "expiresAt" > now()
UNION ALL SELECT 'turnos atendidos tuyos (demo)', count(*) FROM "Booking" b JOIN "Service" s ON s."id" = b."serviceId"
  WHERE s."slug" LIKE 'demo-%' AND b."userId" = (SELECT "id" FROM "User" WHERE lower("email") = 'guaita.franco@gmail.com')
    AND b."status" = 'BOOKED' AND b."endsAt" < now()
UNION ALL SELECT 'turnos futuros tuyos (demo)', count(*) FROM "Booking" b JOIN "Service" s ON s."id" = b."serviceId"
  WHERE s."slug" LIKE 'demo-%' AND b."userId" = (SELECT "id" FROM "User" WHERE lower("email") = 'guaita.franco@gmail.com')
    AND b."startsAt" > now()
UNION ALL SELECT 'premios de racha', count(*) FROM "StreakPrize" WHERE "clientEmail" LIKE 'demog.%@example.com';

-- Si los números están bien:  COMMIT;
-- Si no:                       ROLLBACK;

-- =====================================================================================================================
-- OPCIONAL, justo antes de la demo: volver a ver los modales de Insignias.
-- Los Niveles ya ganados no se pierden ni se repiten: si tu cuenta ya los tenía de pruebas anteriores, no aparece el
-- modal. Esto los borra y se vuelven a ganar (y a celebrar) la próxima vez que abrís la app. Correlo aparte.
--
--   DELETE FROM "UserBadge" WHERE "userId" = (SELECT "id" FROM "User" WHERE lower("email") = 'guaita.franco@gmail.com');
--
-- Si salen demasiados modales seguidos, marcá algunos como vistos:
--   UPDATE "UserBadge" SET "seenAt" = now() WHERE "badge" = 'loyal-clients'
--     AND "userId" = (SELECT "id" FROM "User" WHERE lower("email") = 'guaita.franco@gmail.com');
-- =====================================================================================================================
