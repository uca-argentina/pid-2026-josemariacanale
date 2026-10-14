-- CreateEnum
CREATE TYPE "BookingActor" AS ENUM ('EMPLOYEE', 'CLIENT', 'RETIREMENT');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "acceptedAt" TIMESTAMPTZ(3),
ADD COLUMN     "cancelledBy" "BookingActor",
ADD COLUMN     "cancellationReason" TEXT;

-- Backfill: when a Turno already BOOKED was accepted is unknown, so its creation stands in; cancelledBy of the already cancelled or rejected stays null
UPDATE "Booking" SET "acceptedAt" = "createdAt" WHERE "status" = 'BOOKED';

-- cancelledBy only makes sense in a cancelled or rejected Turno, and the Motivo de cancelación only with cancelledBy (ADR 0004)
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_cancelledBy_only_cancelled_or_rejected" CHECK ("cancelledBy" IS NULL OR "status" IN ('CANCELLED', 'REJECTED'));
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_cancellationReason_needs_cancelledBy" CHECK ("cancellationReason" IS NULL OR "cancelledBy" IS NOT NULL);
