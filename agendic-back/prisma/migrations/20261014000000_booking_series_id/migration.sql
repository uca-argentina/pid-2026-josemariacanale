-- Serie (#303): the Turnos booked together with Repetición share a seriesId; null in a Turno suelto.
ALTER TABLE "Booking" ADD COLUMN "seriesId" UUID;

CREATE INDEX "Booking_seriesId_idx" ON "Booking"("seriesId");
