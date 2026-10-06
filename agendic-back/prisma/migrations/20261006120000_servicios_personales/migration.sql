-- Servicios personales y Enlace de reserva del Usuario (ADR 0021).

-- User: su tramo del Enlace de reserva, que elige él. Nulo hasta que lo elige.
ALTER TABLE "User" ADD COLUMN "slug" TEXT;
CREATE UNIQUE INDEX "User_slug_key" ON "User"("slug");

-- Service: de una Sucursal o de un Usuario, nunca de los dos.
ALTER TABLE "Service" ALTER COLUMN "branchId" DROP NOT NULL;
ALTER TABLE "Service" ADD COLUMN "userId" INTEGER;
ALTER TABLE "Service" ADD COLUMN "availabilityId" INTEGER;
ALTER TABLE "Service" ADD CONSTRAINT "Service_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Service" ADD CONSTRAINT "Service_availabilityId_fkey" FOREIGN KEY ("availabilityId") REFERENCES "Availability"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Hand-written (docs/adr/0004): exactly one of branchId and userId; only a personal one has an Availability (a
-- personal one dado de baja drops it, so it can be deleted).
ALTER TABLE "Service" ADD CONSTRAINT "Service_owner_check"
  CHECK (("branchId" IS NULL) <> ("userId" IS NULL) AND ("branchId" IS NULL OR "availabilityId" IS NULL));

-- Hand-written (docs/adr/0004): name (any casing) and slug unique per Usuario among their Servicios not dados de baja.
CREATE UNIQUE INDEX "Service_userId_name_ci_key" ON "Service"("userId", lower("name")) WHERE "retiredAt" IS NULL AND "userId" IS NOT NULL;
CREATE UNIQUE INDEX "Service_userId_slug_key" ON "Service"("userId", "slug") WHERE "retiredAt" IS NULL AND "userId" IS NOT NULL;

-- Booking: the occupancy is per attending Usuario. Existing Turnos get their Empleado's Usuario.
ALTER TABLE "Booking" ADD COLUMN "userId" INTEGER;
UPDATE "Booking" SET "userId" = (SELECT "userId" FROM "Employee" WHERE "Employee"."id" = "Booking"."employeeId");
ALTER TABLE "Booking" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "Booking" ALTER COLUMN "employeeId" DROP NOT NULL;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- A Usuario can't have two overlapping PENDING or BOOKED Turnos, personal or of any Negocio, Tiempo de
-- preparación included: [prepStartsAt, endsAt). Half-open: back-to-back is allowed.
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_no_overlap";
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_no_overlap"
  EXCLUDE USING gist ("userId" WITH =, tstzrange("prepStartsAt", "endsAt", '[)') WITH &&)
  WHERE ("status" IN ('PENDING', 'BOOKED'));
