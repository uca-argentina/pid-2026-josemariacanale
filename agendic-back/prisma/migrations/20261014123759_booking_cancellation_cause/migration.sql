-- CreateEnum
CREATE TYPE "CancellationCause" AS ENUM ('OUT_OF_OFFICE', 'PUBLIC_HOLIDAY', 'SCHEDULE_CHANGE');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "cancellationCause" "CancellationCause";

-- A causa only makes sense in a Turno cancelled by the Empleado with the Motivo de cancelación Agendic wrote (ADR 0004)
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_cancellationCause_only_with_reason" CHECK ("cancellationCause" IS NULL OR ("status" = 'CANCELLED' AND "cancelledBy" IS NOT NULL AND "cancelledBy" = 'EMPLOYEE' AND "cancellationReason" IS NOT NULL));
