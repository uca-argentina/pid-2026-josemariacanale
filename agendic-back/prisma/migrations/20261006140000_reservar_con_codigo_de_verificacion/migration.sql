-- El Turno nace con el email verificado (ADR 0022): desaparecen el estado UNVERIFIED y los campos de token.
ALTER TABLE "Booking" DROP COLUMN "verificationTokenHash",
                      DROP COLUMN "verificationTokenExpiresAt",
                      ALTER COLUMN "status" DROP DEFAULT;

-- Sacar un valor de enum revalida la exclusion constraint que lo filtra por WHERE, así que se dropea antes
-- del cambio de tipo y se recrea después (ADR 0004).
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_no_overlap";

-- Un valor de enum no se puede sacar en la misma transacción en la que todavía está en uso (misma regla que
-- ADR 0004 para agregar un valor): se reconstruye el tipo.
ALTER TYPE "BookingStatus" RENAME TO "BookingStatus_old";
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'BOOKED', 'REJECTED', 'CANCELLED');
ALTER TABLE "Booking" ALTER COLUMN "status" TYPE "BookingStatus" USING ("status"::text::"BookingStatus");
DROP TYPE "BookingStatus_old";

ALTER TABLE "Booking" ADD CONSTRAINT "Booking_no_overlap"
  EXCLUDE USING gist ("userId" WITH =, tstzrange("prepStartsAt", "endsAt", '[)') WITH &&)
  WHERE ("status" IN ('PENDING', 'BOOKED'));
