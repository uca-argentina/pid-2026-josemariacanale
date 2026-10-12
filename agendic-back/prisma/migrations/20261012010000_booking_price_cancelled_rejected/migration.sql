-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "cancelledAt" TIMESTAMPTZ(3),
ADD COLUMN     "price" DECIMAL(10,2),
ADD COLUMN     "rejectedAt" TIMESTAMPTZ(3);

-- Backfill: the change time of the Turnos already cancelled or rejected is unknown, so their start stands in; the price is the Servicio's current one
UPDATE "Booking" SET "cancelledAt" = "startsAt" WHERE "status" = 'CANCELLED';
UPDATE "Booking" SET "rejectedAt" = "startsAt" WHERE "status" = 'REJECTED';
UPDATE "Booking" b SET "price" = s."price" FROM "Service" s WHERE s."id" = b."serviceId";

ALTER TABLE "Booking" ALTER COLUMN "price" SET NOT NULL;

-- cancelledAt and rejectedAt only make sense in their own status (ADR 0004)
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_cancelledAt_only_cancelled" CHECK ("cancelledAt" IS NULL OR "status" = 'CANCELLED');
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_rejectedAt_only_rejected" CHECK ("rejectedAt" IS NULL OR "status" = 'REJECTED');
