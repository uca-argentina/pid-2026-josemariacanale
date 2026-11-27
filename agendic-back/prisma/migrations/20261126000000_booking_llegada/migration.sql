-- AlterTable: los Turnos que ya existen quedan sin Llegada (null).
ALTER TABLE "Booking" ADD COLUMN "llegoEn" TIMESTAMPTZ(3);
