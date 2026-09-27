-- Update Exclusion Constraint to include CONFIRMADO and BOOKED
ALTER TABLE "Booking" DROP CONSTRAINT IF EXISTS "Booking_no_overlap";
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_no_overlap"
  EXCLUDE USING gist ("employeeId" WITH =, tstzrange("startsAt", "endsAt", '[)') WITH &&)
  WHERE ("status" IN ('BOOKED', 'CONFIRMADO'));
