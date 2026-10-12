-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "rescheduled" BOOLEAN,
ADD COLUMN "fromRescheduleId" INTEGER,
ALTER COLUMN "link" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Booking_fromRescheduleId_key" ON "Booking"("fromRescheduleId");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_fromRescheduleId_fkey" FOREIGN KEY ("fromRescheduleId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Reagendar marks only the original, which stays CANCELLED (ADR 0031)
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_rescheduled_only_cancelled" CHECK ("rescheduled" IS NULL OR ("rescheduled" AND "status" = 'CANCELLED'));
