-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "depositAmount" DECIMAL(10,2),
ADD COLUMN     "depositPaidAt" TIMESTAMPTZ(3);
