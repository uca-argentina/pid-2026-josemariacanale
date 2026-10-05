-- La Availability pasa a ser del Usuario, con zona horaria propia (ADR 0020, 0021). La Anulación pasa a ser de una
-- Availability y la Cobertura desaparece. Sin migración de datos: la base se resetea antes de aplicarla
-- (`prisma migrate reset`), porque las columnas NOT NULL nuevas no tienen de dónde sacar un valor.

-- Availability
DROP INDEX "Availability_employeeId_default_key";
ALTER TABLE "Availability" DROP CONSTRAINT "Availability_employeeId_fkey";
ALTER TABLE "Availability" DROP COLUMN "employeeId";
ALTER TABLE "Availability" ADD COLUMN "userId" INTEGER NOT NULL;
ALTER TABLE "Availability" ADD COLUMN "timeZone" TEXT NOT NULL;
ALTER TABLE "Availability" ADD CONSTRAINT "Availability_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Hand-written (docs/adr/0004): at most one default Availability per Usuario.
CREATE UNIQUE INDEX "Availability_userId_default_key" ON "Availability"("userId") WHERE "isDefault";

-- AvailabilityInterval: `days` en vez de `weekday`. Dos Franjas del mismo día ya no se pisan por constraint: un
-- exclude no compara un arreglo elemento a elemento, así que lo valida la API.
ALTER TABLE "AvailabilityInterval" DROP CONSTRAINT "AvailabilityInterval_no_overlap";
ALTER TABLE "AvailabilityInterval" DROP COLUMN "weekday";
ALTER TABLE "AvailabilityInterval" ADD COLUMN "days" INTEGER[];

-- AvailabilityOverride: de una Availability, sin Cobertura.
DROP INDEX "AvailabilityOverride_employeeId_date_idx";
ALTER TABLE "AvailabilityOverride" DROP CONSTRAINT "AvailabilityOverride_no_overlap";
ALTER TABLE "AvailabilityOverride" DROP CONSTRAINT "AvailabilityOverride_employeeId_fkey";
ALTER TABLE "AvailabilityOverride" DROP CONSTRAINT "AvailabilityOverride_coveredByEmployeeId_fkey";
ALTER TABLE "AvailabilityOverride" DROP COLUMN "employeeId";
ALTER TABLE "AvailabilityOverride" DROP COLUMN "coveredByEmployeeId";
ALTER TABLE "AvailabilityOverride" ADD COLUMN "availabilityId" INTEGER NOT NULL;
CREATE INDEX "AvailabilityOverride_availabilityId_date_idx" ON "AvailabilityOverride"("availabilityId", "date");
ALTER TABLE "AvailabilityOverride" ADD CONSTRAINT "AvailabilityOverride_availabilityId_fkey" FOREIGN KEY ("availabilityId") REFERENCES "Availability"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Hand-written (docs/adr/0004): two Franjas of the same Availability and date don't overlap, half-open so they can
-- touch. A día libre row (both times null) is excluded by the WHERE clause.
ALTER TABLE "AvailabilityOverride" ADD CONSTRAINT "AvailabilityOverride_no_overlap"
  EXCLUDE USING gist (
    "availabilityId" WITH =,
    "date" WITH =,
    tsrange(DATE '2000-01-01' + "startTime", DATE '2000-01-01' + "endTime", '[)') WITH &&
  )
  WHERE ("startTime" IS NOT NULL);
