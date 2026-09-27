-- Anulaciones del Empleado y su Cobertura. No backfill: la base de desarrollo se recrea entera.
-- CreateTable
CREATE TABLE "AvailabilityOverride" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "startTime" TIME(0),
    "endTime" TIME(0),
    "coveredByEmployeeId" INTEGER,

    CONSTRAINT "AvailabilityOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AvailabilityOverride_employeeId_date_idx" ON "AvailabilityOverride"("employeeId", "date");

-- AddForeignKey
ALTER TABLE "AvailabilityOverride" ADD CONSTRAINT "AvailabilityOverride_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityOverride" ADD CONSTRAINT "AvailabilityOverride_coveredByEmployeeId_fkey" FOREIGN KEY ("coveredByEmployeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Hand-written (docs/adr/0004): two Franjas of the same Empleado and date don't overlap, half-open so
-- 09:00–17:00 and 17:00–18:00 can touch. A día libre row (both times null) is excluded by the WHERE
-- clause: tsrange can't be built from null bounds, and there's nothing to overlap anyway.
ALTER TABLE "AvailabilityOverride" ADD CONSTRAINT "AvailabilityOverride_no_overlap"
  EXCLUDE USING gist (
    "employeeId" WITH =,
    "date" WITH =,
    tsrange(DATE '2000-01-01' + "startTime", DATE '2000-01-01' + "endTime", '[)') WITH &&
  )
  WHERE ("startTime" IS NOT NULL);
