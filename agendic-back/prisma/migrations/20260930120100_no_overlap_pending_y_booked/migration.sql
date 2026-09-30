-- Hand-written: not expressible in schema.prisma (ADR 0004).
-- Its own migration: a new enum value can't be used in the transaction that adds it.

-- An Empleado can't have two overlapping PENDING or BOOKED Turnos. Half-open: back-to-back is allowed.
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_no_overlap";
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_no_overlap"
  EXCLUDE USING gist ("employeeId" WITH =, tstzrange("startsAt", "endsAt", '[)') WITH &&)
  WHERE ("status" IN ('PENDING', 'BOOKED'));
