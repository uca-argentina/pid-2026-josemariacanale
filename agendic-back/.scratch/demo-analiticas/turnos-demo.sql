-- Turnos de demo para las Analíticas de un Usuario.
--
-- Correr por partes, en este orden:
--   0) Diagnóstico: qué Servicios atiende el Usuario (si no sale ninguno, el paso 1 aborta).
--   1) Generación, dentro de una transacción.
--   2) Verificación por mes; si está bien, COMMIT, si no, ROLLBACK.
-- Para borrar todo lo generado: limpiar-turnos-demo.sql.
--
-- Qué respeta, para que los Turnos sean "legítimos":
--   - solo Servicios no dados de baja que el Usuario atiende: sus Servicios personales y los del Negocio que Ofrece
--     (con la Availability de cada uno);
--   - Horarios reservables dentro de sus Franjas (o de las Anulaciones de ese día), con el Intervalo, la duración y el
--     Tiempo de preparación del Servicio; saltea días Fuera de la oficina y Días festivos prendidos;
--   - sin solaparse con ningún Turno PENDING/BOOKED del Usuario (en cualquier Servicio) ni de la Cabina; Límite diario;
--   - createdAt antes del Turno y respetando la Anticipación mínima; precio y Seña fijados del Servicio;
--   - Reagendar como lo hace la app (ADR 0031): original CANCELLED con rescheduled = true y sin Enlace del Turno,
--     el nuevo con fromRescheduleId, el mismo createdAt y su propio Cliente;
--   - Rechazados y pendientes solo en Servicios con Aprobación manual, y pendientes solo a futuro;
--   - Calificaciones solo de Turnos atendidos, después de la Invitación a calificar.
--
-- Emails de Cliente en @example.com (dominio reservado, no entrega) y ratingRequestSentAt cargado: ni el
-- RatingRequestsJob ni nadie le manda mails a una persona real. Ese dominio también es lo que usa la limpieza.
--
-- Requiere Postgres 13+ (gen_random_uuid).


-- =====================================================================================================
-- 0) Diagnóstico
-- =====================================================================================================
SELECT u."id", u."name", u."email", u."deletedAt",
       (SELECT bz."name" FROM "Business" bz WHERE bz."ownerId" = u."id" AND bz."deletedAt" IS NULL) AS "negocio_del_que_es_dueno"
FROM "User" u
WHERE lower(u."email") = 'tomas.cortina00@gmail.com';

SELECT 'personal' AS "tipo", s."id", s."name", s."durationMinutes", s."price", s."requiresApproval",
       s."depositPercent", a."name" AS "availability", a."timeZone",
       (SELECT count(*) FROM "AvailabilityInterval" ai WHERE ai."availabilityId" = a."id") AS "franjas"
FROM "Service" s
JOIN "User" u ON u."id" = s."userId"
JOIN "Availability" a ON a."id" = s."availabilityId"
WHERE lower(u."email") = 'tomas.cortina00@gmail.com' AND s."deletedAt" IS NULL
UNION ALL
SELECT 'negocio: ' || bz."name", s."id", s."name", s."durationMinutes", s."price", s."requiresApproval",
       s."depositPercent", a."name", a."timeZone",
       (SELECT count(*) FROM "AvailabilityInterval" ai WHERE ai."availabilityId" = a."id")
FROM "EmployeeService" es
JOIN "Employee" e ON e."id" = es."employeeId"
JOIN "User" u ON u."id" = e."userId"
JOIN "Service" s ON s."id" = es."serviceId"
JOIN "Branch" br ON br."id" = s."branchId"
JOIN "Business" bz ON bz."id" = br."businessId"
JOIN "Availability" a ON a."id" = es."availabilityId"
WHERE lower(u."email") = 'tomas.cortina00@gmail.com'
  AND e."deletedAt" IS NULL AND s."deletedAt" IS NULL AND bz."deletedAt" IS NULL;

-- Tiene que dar 0: es el marcador de la limpieza.
SELECT count(*) AS "clientes_example_com_previos" FROM "Client" WHERE "email" LIKE '%@example.com';


-- =====================================================================================================
-- 1) Generación
-- =====================================================================================================
BEGIN;

DO $$
DECLARE
  -- Parámetros ------------------------------------------------------------------------------------
  p_email         constant text    := 'tomas.cortina00@gmail.com';
  p_from          constant date    := (now() - interval '1 year')::date;  -- primer día con Turnos
  p_to            constant date    := (now() + interval '21 days')::date; -- unos pocos a futuro, para "pendientes"
  -- true: genera también para el resto del Staff del Negocio del que el Usuario es Dueño
  -- (llena los rankings de Empleados de las Analíticas del Negocio).
  p_include_staff constant boolean := false;

  first_names text[] := ARRAY['Lucía','Martina','Sofía','Valentina','Camila','Julieta','Florencia','Agustina',
    'Carolina','Paula','Micaela','Rocío','Victoria','Milagros','Belén','Natalia','Romina','Daniela','Gabriela',
    'Mariana','Juan','Santiago','Mateo','Joaquín','Tomás','Nicolás','Facundo','Matías','Federico','Martín',
    'Lucas','Agustín','Franco','Ignacio','Gonzalo','Diego','Pablo','Sebastián','Leandro','Bruno'];
  last_names text[] := ARRAY['González','Rodríguez','Fernández','López','Martínez','García','Pérez','Gómez',
    'Sánchez','Romero','Díaz','Álvarez','Torres','Ruiz','Ramírez','Flores','Benítez','Acosta','Medina','Herrera',
    'Suárez','Aguirre','Giménez','Molina','Castro','Ortiz','Silva','Rojas','Sosa','Vega','Ferrari','Rossi',
    'Bianchi','Morales','Peralta','Navarro','Cabrera','Ríos','Paz','Ledesma'];
  good_comments text[] := ARRAY['Excelente atención, muy puntual.','Súper recomendable, vuelvo seguro.',
    'Muy profesional y amable.','Todo impecable, ¡gracias!','Me encantó el resultado.',
    'Muy buena experiencia de principio a fin.','Atención de diez.','Muy cómodo reservar y llegar.'];
  mid_comments text[] := ARRAY['Bien, aunque tuve que esperar un poco.','Correcto, nada para destacar.',
    'Buena atención pero el lugar estaba lleno.','Cumplió, aunque esperaba algo más.'];
  bad_comments text[] := ARRAY['Me hicieron esperar más de 20 minutos.','No quedé conforme con el resultado.',
    'Llegué y no tenían bien registrado el horario.','Poca atención al detalle.'];
  booking_notes text[] := ARRAY['Es mi primera vez.','Si se puede, prefiero a la misma persona que la vez pasada.',
    'Puede que llegue 5 minutos tarde por el trabajo.','Tengo una molestia en el hombro derecho.',
    'Prefiero pagar con transferencia.','Me lo recomendó una amiga.','Avísenme si se libera un horario antes, por favor.'];
  -- Estacionalidad, enero..diciembre.
  month_factor numeric[] := ARRAY[0.70,0.75,0.95,1.00,1.05,0.95,0.85,0.95,1.05,1.10,1.15,1.20];

  pool_size constant int := 150;
  pool_names  text[] := '{}';
  pool_emails text[] := '{}';

  v_now         timestamptz := now();
  v_user_id     int;
  v_business_id int;
  v_first       text;
  v_last        text;

  d             date;
  o             record;
  iv            record;
  lt            timestamp;
  v_p           numeric;
  v_dur         interval;
  v_prep        interval;
  v_step        interval;
  v_starts      timestamptz;
  v_ends        timestamptz;
  v_prep_starts timestamptz;
  v_created     timestamptz;
  v_decided     timestamptz;
  v_cabin_id    int;
  v_ci          int;
  v_name        text;
  v_mail        text;
  v_notes       text;
  v_chosen      boolean;
  v_link        text;
  v_status      "BookingStatus";
  v_cancelled   timestamptz;
  v_rejected    timestamptz;
  v_noshow      timestamptz;
  v_emp_noshow  timestamptz;
  v_deposit     numeric;
  v_paid        timestamptz;
  v_resched_at  timestamptz;
  v_orig_starts timestamptz;
  v_orig_id     int;
  v_id          int;
  v_roll        double precision;
  v_score       int;
  v_rated_at    timestamptz;
  v_total       int := 0;
  v_resched     int := 0;
  v_ratings     int := 0;
BEGIN
  SELECT "id" INTO v_user_id FROM "User" WHERE lower("email") = p_email AND "deletedAt" IS NULL;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No active User with email %', p_email;
  END IF;
  SELECT "id" INTO v_business_id FROM "Business" WHERE "ownerId" = v_user_id AND "deletedAt" IS NULL;

  -- Pool de Clientes: los primeros salen mucho más (clientes habituales, para la Ficha del Cliente).
  FOR i IN 1..pool_size LOOP
    v_first := first_names[1 + floor(random() * array_length(first_names, 1))::int];
    v_last  := last_names[1 + floor(random() * array_length(last_names, 1))::int];
    pool_names  := pool_names || (v_first || ' ' || v_last);
    pool_emails := pool_emails || (
      translate(lower(v_first), 'áéíóúüñ', 'aeiouun') || '.' || translate(lower(v_last), 'áéíóúüñ', 'aeiouun')
      || CASE WHEN random() < 0.4 THEN (10 + floor(random() * 89))::int::text ELSE '' END
      || '@example.com');
  END LOOP;

  FOR d IN SELECT generate_series(p_from, p_to, interval '1 day')::date LOOP
    -- Ocupación que crece a lo largo del año, con estacionalidad y más demanda viernes y sábados.
    v_p := (0.22 + 0.28 * least(1, (d - p_from)::numeric / 365))
           * month_factor[extract(month FROM d)::int]
           * CASE extract(dow FROM d)::int WHEN 1 THEN 0.85 WHEN 5 THEN 1.10 WHEN 6 THEN 1.25 ELSE 1 END;
    IF d > v_now::date THEN v_p := v_p * 0.55; END IF;
    v_p := least(v_p, 0.9);

    FOR o IN
      SELECT * FROM (
        SELECT s."id" AS service_id, s."durationMinutes" AS dur, s."prepMinutes" AS prep, s."slotInterval" AS step,
               s."minimumNoticeMinutes" AS notice, s."dailyLimit" AS daily_limit, s."price" AS price,
               s."depositPercent" AS deposit_pct, s."requiresApproval" AS approval,
               NULL::int AS employee_id, s."userId" AS user_id, a."id" AS availability_id, a."timeZone" AS tz
        FROM "Service" s
        JOIN "Availability" a ON a."id" = s."availabilityId"
        WHERE s."userId" = v_user_id AND s."deletedAt" IS NULL
        UNION ALL
        SELECT s."id", s."durationMinutes", s."prepMinutes", s."slotInterval", s."minimumNoticeMinutes",
               s."dailyLimit", s."price", s."depositPercent", s."requiresApproval",
               e."id", e."userId", a."id", a."timeZone"
        FROM "EmployeeService" es
        JOIN "Employee" e ON e."id" = es."employeeId"
        JOIN "Service" s ON s."id" = es."serviceId"
        JOIN "Branch" br ON br."id" = s."branchId"
        JOIN "Business" bz ON bz."id" = br."businessId"
        JOIN "Availability" a ON a."id" = es."availabilityId"
        WHERE e."deletedAt" IS NULL AND s."deletedAt" IS NULL AND bz."deletedAt" IS NULL
          AND (e."userId" = v_user_id OR (p_include_staff AND bz."id" = v_business_id))
      ) q
      ORDER BY random()
    LOOP
      -- Fuera de la oficina y Días festivos prendidos: sin Horarios reservables ese día.
      CONTINUE WHEN EXISTS (
        SELECT 1 FROM "OutOfOffice" x
        WHERE x."userId" = o.user_id AND d BETWEEN x."startDate" AND x."endDate");
      CONTINUE WHEN EXISTS (
        SELECT 1 FROM "UserHolidaySettings" h
        JOIN "HolidayCache" hc ON hc."countryCode" = h."countryCode"
        WHERE h."userId" = o.user_id AND hc."date" = d AND NOT (hc."eventId" = ANY (h."disabledIds")));

      v_dur  := make_interval(mins => o.dur);
      v_prep := make_interval(mins => o.prep);
      v_step := make_interval(mins => coalesce(o.step, o.dur));

      -- Franjas del día: las de la Anulación si hay una para esa fecha (sin horas = día libre), si no las semanales.
      FOR iv IN
        SELECT ao."startTime" AS st, ao."endTime" AS et
        FROM "AvailabilityOverride" ao
        WHERE ao."availabilityId" = o.availability_id AND ao."date" = d AND ao."startTime" IS NOT NULL
        UNION ALL
        SELECT ai."startTime", ai."endTime"
        FROM "AvailabilityInterval" ai
        WHERE ai."availabilityId" = o.availability_id
          AND extract(dow FROM d)::int = ANY (ai."days")
          AND NOT EXISTS (
            SELECT 1 FROM "AvailabilityOverride" ao
            WHERE ao."availabilityId" = o.availability_id AND ao."date" = d)
      LOOP
        FOR lt IN SELECT generate_series(d + iv.st, d + iv.et - v_dur, v_step) LOOP
          CONTINUE WHEN random() >= v_p;

          v_starts      := lt AT TIME ZONE o.tz;
          v_ends        := v_starts + v_dur;
          v_prep_starts := v_starts - v_prep;

          -- El Usuario libre (en todos sus Servicios), Tiempo de preparación incluido.
          CONTINUE WHEN EXISTS (
            SELECT 1 FROM "Booking" b
            WHERE b."userId" = o.user_id AND b."status" IN ('PENDING', 'BOOKED')
              AND tstzrange(b."prepStartsAt", b."endsAt", '[)') && tstzrange(v_prep_starts, v_ends, '[)'));
          -- Límite diario.
          CONTINUE WHEN o.daily_limit IS NOT NULL AND (
            SELECT count(*) FROM "Booking" b
            WHERE b."serviceId" = o.service_id AND b."status" IN ('PENDING', 'BOOKED')
              AND (b."startsAt" AT TIME ZONE o.tz)::date = d) >= o.daily_limit;
          -- Cabina libre, si el Servicio admite Cabinas.
          v_cabin_id := NULL;
          IF EXISTS (
            SELECT 1 FROM "ServiceCabin" sc JOIN "Cabin" cb ON cb."id" = sc."cabinId"
            WHERE sc."serviceId" = o.service_id AND cb."deletedAt" IS NULL
          ) THEN
            SELECT cb."id" INTO v_cabin_id
            FROM "ServiceCabin" sc JOIN "Cabin" cb ON cb."id" = sc."cabinId"
            WHERE sc."serviceId" = o.service_id AND cb."deletedAt" IS NULL
              AND NOT EXISTS (
                SELECT 1 FROM "Booking" b
                WHERE b."cabinId" = cb."id" AND b."status" IN ('PENDING', 'BOOKED')
                  AND tstzrange(b."prepStartsAt", b."endsAt", '[)') && tstzrange(v_prep_starts, v_ends, '[)'))
            ORDER BY random() LIMIT 1;
            CONTINUE WHEN v_cabin_id IS NULL;
          END IF;

          -- Cliente, Comentario del Turno, Empleado elegido.
          v_ci     := 1 + floor(power(random(), 2.2) * pool_size)::int;
          v_name   := pool_names[v_ci];
          v_mail   := pool_emails[v_ci];
          v_notes  := CASE WHEN random() < 0.12
                        THEN booking_notes[1 + floor(random() * array_length(booking_notes, 1))::int] END;
          v_chosen := o.employee_id IS NOT NULL AND random() < 0.25;
          v_link   := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');

          -- Cuándo se Reservó: antes del Turno y respetando la Anticipación mínima.
          IF v_starts > v_now THEN
            v_created := least(v_now - random() * interval '12 days',
                               v_starts - make_interval(mins => o.notice) - interval '5 minutes');
          ELSE
            v_created := v_starts - make_interval(mins => o.notice) - interval '2 hours'
                         - power(random(), 2) * interval '20 days';
          END IF;

          -- Reagendar (7%): el original queda CANCELLED con rescheduled = true en otro horario.
          v_resched_at := NULL;
          v_orig_id    := NULL;
          IF random() < 0.07 THEN
            v_resched_at  := v_created + random() * (least(v_starts, v_now) - v_created);
            v_orig_starts := v_starts + make_interval(
              days => (CASE WHEN random() < 0.5 THEN -1 ELSE 1 END) * (1 + floor(random() * 4))::int);
            IF v_orig_starts <= v_resched_at + interval '1 hour' THEN
              v_orig_starts := v_starts + make_interval(days => (1 + floor(random() * 4))::int);
            END IF;
          END IF;
          v_decided := coalesce(v_resched_at, v_created);

          -- Seña: fijada al Reservar; pagada casi siempre, antes del Turno.
          v_deposit := CASE WHEN o.deposit_pct IS NOT NULL THEN round(o.price * o.deposit_pct / 100.0, 2) END;
          v_paid := NULL;
          IF v_deposit IS NOT NULL AND random() < 0.85 THEN
            v_paid := v_created + random() * interval '20 hours';
            IF v_paid >= least(v_starts, v_now) THEN v_paid := NULL; END IF;
          END IF;

          -- Estado final.
          v_cancelled := NULL; v_rejected := NULL; v_noshow := NULL; v_emp_noshow := NULL;
          v_roll := random();
          IF v_roll < 0.08 THEN
            v_status    := 'CANCELLED'::"BookingStatus";
            v_cancelled := v_decided + random() * (least(v_starts, v_now) - v_decided);
          ELSIF o.approval AND v_roll < 0.14 THEN
            v_status   := 'REJECTED'::"BookingStatus";
            v_rejected := v_decided + least(random() * interval '18 hours', (least(v_starts, v_now) - v_decided) * 0.9);
          ELSIF o.approval AND v_starts > v_now AND random() < 0.6 THEN
            v_status := 'PENDING'::"BookingStatus";
          ELSE
            v_status := 'BOOKED'::"BookingStatus";
            IF v_ends < v_now THEN
              v_roll := random();
              IF v_roll < 0.06 THEN
                v_noshow := least(v_ends + random() * interval '3 hours', v_now);
              ELSIF v_roll < 0.08 THEN
                v_emp_noshow := least(v_starts + interval '10 minutes' + random() * interval '30 minutes', v_now);
              END IF;
            END IF;
          END IF;

          IF v_resched_at IS NOT NULL THEN
            INSERT INTO "Booking" ("serviceId", "employeeId", "userId", "cabinId", "prepStartsAt", "startsAt", "endsAt",
              "status", "notes", "link", "employeeChosen", "depositAmount", "depositPaidAt", "price", "cancelledAt",
              "rescheduled", "createdAt")
            VALUES (o.service_id, o.employee_id, o.user_id, v_cabin_id, v_orig_starts - v_prep, v_orig_starts,
              v_orig_starts + v_dur, 'CANCELLED', v_notes, NULL, v_chosen, v_deposit, v_paid, o.price, v_resched_at,
              TRUE, v_created)
            RETURNING "id" INTO v_orig_id;
            INSERT INTO "Client" ("bookingId", "name", "email") VALUES (v_orig_id, v_name, v_mail);
            v_resched := v_resched + 1;
          END IF;

          INSERT INTO "Booking" ("serviceId", "employeeId", "userId", "cabinId", "prepStartsAt", "startsAt", "endsAt",
            "status", "notes", "noShowAt", "employeeNoShowAt", "link", "employeeChosen", "depositAmount",
            "depositPaidAt", "price", "cancelledAt", "rejectedAt", "fromRescheduleId", "ratingRequestSentAt",
            "createdAt")
          VALUES (o.service_id, o.employee_id, o.user_id, v_cabin_id, v_prep_starts, v_starts, v_ends,
            v_status, v_notes, v_noshow, v_emp_noshow, v_link, v_chosen, v_deposit,
            v_paid, o.price, v_cancelled, v_rejected, v_orig_id,
            -- Cargado en todo Turno que podría recibir la Invitación a calificar, para que el job no mande mails.
            CASE WHEN v_status IN ('BOOKED', 'PENDING') THEN v_ends + interval '1 hour' END,
            v_created)
          RETURNING "id" INTO v_id;
          INSERT INTO "Client" ("bookingId", "name", "email") VALUES (v_id, v_name, v_mail);
          v_total := v_total + 1;

          -- Calificación (55% de los atendidos), después de la Invitación a calificar y hasta 7 días.
          IF v_status = 'BOOKED' AND v_ends < v_now AND v_noshow IS NULL AND v_emp_noshow IS NULL
             AND random() < 0.55 THEN
            v_rated_at := v_ends + interval '1 hour' + power(random(), 3) * interval '6 days';
            IF v_rated_at <= v_now THEN
              v_roll  := random();
              v_score := CASE WHEN v_roll < 0.52 THEN 5 WHEN v_roll < 0.82 THEN 4 WHEN v_roll < 0.93 THEN 3
                              WHEN v_roll < 0.97 THEN 2 ELSE 1 END;
              INSERT INTO "BookingRating" ("bookingId", "score", "comment", "createdAt")
              VALUES (v_id, v_score,
                CASE WHEN random() < 0.45 THEN
                  CASE WHEN v_score >= 4 THEN good_comments[1 + floor(random() * array_length(good_comments, 1))::int]
                       WHEN v_score = 3  THEN mid_comments[1 + floor(random() * array_length(mid_comments, 1))::int]
                       ELSE bad_comments[1 + floor(random() * array_length(bad_comments, 1))::int] END
                END,
                v_rated_at);
              v_ratings := v_ratings + 1;
            END IF;
          END IF;
        END LOOP;
      END LOOP;
    END LOOP;
  END LOOP;

  IF v_total = 0 THEN
    RAISE EXCEPTION 'User % has no Servicio with Franjas to book: nothing generated', p_email;
  END IF;
  RAISE NOTICE 'Turnos: %, reagendados: %, Calificaciones: %', v_total, v_resched, v_ratings;
END $$;


-- =====================================================================================================
-- 2) Verificación (todavía dentro de la transacción)
-- =====================================================================================================
SELECT to_char(date_trunc('month', b."startsAt"), 'YYYY-MM') AS "mes",
       count(*) FILTER (WHERE b."rescheduled" IS NOT TRUE) AS "turnos",
       count(*) FILTER (WHERE b."rescheduled" IS NOT TRUE AND b."status" = 'BOOKED' AND b."endsAt" < now()
                          AND b."noShowAt" IS NULL AND b."employeeNoShowAt" IS NULL) AS "atendidos",
       count(*) FILTER (WHERE b."rescheduled" IS NOT TRUE AND b."status" = 'CANCELLED') AS "cancelados",
       count(*) FILTER (WHERE b."rescheduled") AS "reagendados",
       count(*) FILTER (WHERE b."status" = 'REJECTED') AS "rechazados",
       count(*) FILTER (WHERE b."status" = 'PENDING') AS "pendientes",
       count(*) FILTER (WHERE b."noShowAt" IS NOT NULL) AS "ausencia_invitado",
       count(*) FILTER (WHERE b."employeeNoShowAt" IS NOT NULL) AS "ausencia_anfitrion",
       count(r."id") AS "calificaciones",
       round(avg(r."score"), 2) AS "promedio",
       sum(b."price") FILTER (WHERE b."rescheduled" IS NOT TRUE AND b."status" = 'BOOKED' AND b."endsAt" < now()
                                AND b."noShowAt" IS NULL AND b."employeeNoShowAt" IS NULL) AS "ingresos"
FROM "Booking" b
JOIN "Client" c ON c."bookingId" = b."id"
LEFT JOIN "BookingRating" r ON r."bookingId" = b."id"
WHERE c."email" LIKE '%@example.com'
GROUP BY 1
ORDER BY 1;

-- Si los números están bien:  COMMIT;
-- Si no:                       ROLLBACK;
