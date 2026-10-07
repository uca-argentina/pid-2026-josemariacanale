-- Enlace del Turno (ADR 0022): identificador secreto, único y no adivinable que abre un Turno sin Código de
-- verificación. Los Turnos existentes nunca retuvieron uno, así que se backfillean con gen_random_uuid() (nativo
-- desde Postgres 13, sin pgcrypto), dos concatenados para pasar los 128 bits pedidos.
ALTER TABLE "Booking" ADD COLUMN "link" TEXT;

UPDATE "Booking" SET "link" = replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');

ALTER TABLE "Booking" ALTER COLUMN "link" SET NOT NULL;
CREATE UNIQUE INDEX "Booking_link_key" ON "Booking"("link");
