-- AlterTable: Tiempo de preparación and Límite diario of the Servicio
ALTER TABLE "Service" ADD COLUMN "prepMinutes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "dailyLimit" INTEGER;

-- AlterTable: every Turno holds its Empleado's agenda from prepStartsAt. Existing Turnos had no preparation.
ALTER TABLE "Booking" ADD COLUMN "prepStartsAt" TIMESTAMPTZ(3);
UPDATE "Booking" SET "prepStartsAt" = "startsAt";
ALTER TABLE "Booking" ALTER COLUMN "prepStartsAt" SET NOT NULL;

-- Hand-written: not expressible in schema.prisma (ADR 0004).
-- An Empleado can't have two overlapping PENDING or BOOKED Turnos, each counted with its Tiempo de
-- preparación: [prepStartsAt, endsAt). Half-open: back-to-back is allowed.
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_no_overlap";
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_no_overlap"
  EXCLUDE USING gist ("employeeId" WITH =, tstzrange("prepStartsAt", "endsAt", '[)') WITH &&)
  WHERE ("status" IN ('PENDING', 'BOOKED'));
