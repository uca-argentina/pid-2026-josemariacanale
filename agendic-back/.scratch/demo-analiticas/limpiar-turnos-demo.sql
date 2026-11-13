-- Borra los Turnos de demo de turnos-demo.sql: los que tienen Cliente @example.com.
-- BookingRating y Client caen en cascada; fromRescheduleId queda en NULL solo (ON DELETE SET NULL).

BEGIN;

-- Revisar antes de borrar: tiene que coincidir con lo que generó la demo.
SELECT count(*) AS "turnos_a_borrar"
FROM "Booking" b
JOIN "Client" c ON c."bookingId" = b."id"
WHERE c."email" LIKE '%@example.com';

DELETE FROM "Booking" b
USING "Client" c
WHERE c."bookingId" = b."id" AND c."email" LIKE '%@example.com';

-- COMMIT;  o  ROLLBACK;
