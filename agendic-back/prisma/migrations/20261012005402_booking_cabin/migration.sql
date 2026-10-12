-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "cabinId" INTEGER;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_cabinId_fkey" FOREIGN KEY ("cabinId") REFERENCES "Cabin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Hand-written: not expressible in schema.prisma (ADR 0004).
-- A Cabina can't have two overlapping PENDING or BOOKED Turnos, preparation included. Half-open: back-to-back is allowed.
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_cabin_no_overlap"
  EXCLUDE USING gist ("cabinId" WITH =, tstzrange("prepStartsAt", "endsAt", '[)') WITH &&)
  WHERE ("cabinId" IS NOT NULL AND "status" IN ('PENDING', 'BOOKED'));
