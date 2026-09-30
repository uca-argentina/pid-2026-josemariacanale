-- AlterEnum
ALTER TYPE "BookingStatus" ADD VALUE 'PENDING';
ALTER TYPE "BookingStatus" ADD VALUE 'REJECTED';

-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "requiresApproval" BOOLEAN NOT NULL DEFAULT false;
