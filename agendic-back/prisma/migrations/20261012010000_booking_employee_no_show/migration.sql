ALTER TABLE "Booking" ADD COLUMN "employeeNoShowAt" TIMESTAMPTZ(3);

-- Ausencia y Falta del Empleado se excluyen: gana la primera que se marca.
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_no_show_exclusive" CHECK ("noShowAt" IS NULL OR "employeeNoShowAt" IS NULL);
