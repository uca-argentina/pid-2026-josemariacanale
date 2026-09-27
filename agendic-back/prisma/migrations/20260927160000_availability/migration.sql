-- Availability del Empleado y sus Franjas. No backfill: la base de desarrollo se recrea entera.
-- CreateTable
CREATE TABLE "Availability" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL,

    CONSTRAINT "Availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvailabilityInterval" (
    "id" SERIAL NOT NULL,
    "availabilityId" INTEGER NOT NULL,
    "weekday" INTEGER NOT NULL,
    "startTime" TIME(0) NOT NULL,
    "endTime" TIME(0) NOT NULL,

    CONSTRAINT "AvailabilityInterval_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Availability" ADD CONSTRAINT "Availability_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityInterval" ADD CONSTRAINT "AvailabilityInterval_availabilityId_fkey" FOREIGN KEY ("availabilityId") REFERENCES "Availability"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Hand-written (docs/adr/0004): two Franjas of the same Availability and weekday don't overlap. Half-open, so
-- 09:00–17:00 and 17:00–18:00 touch without clashing. Postgres has no time range type, so each time is pinned
-- to one arbitrary date to compare it as a tsrange. btree_gist is already installed by the init migration.
ALTER TABLE "AvailabilityInterval" ADD CONSTRAINT "AvailabilityInterval_no_overlap"
  EXCLUDE USING gist (
    "availabilityId" WITH =,
    "weekday" WITH =,
    tsrange(DATE '2000-01-01' + "startTime", DATE '2000-01-01' + "endTime", '[)') WITH &&
  );

-- Hand-written (docs/adr/0004): at most one default Availability per Empleado.
CREATE UNIQUE INDEX "Availability_employeeId_default_key" ON "Availability"("employeeId") WHERE "isDefault";
