-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateTable
CREATE TABLE "Claim" (
    "id" SERIAL NOT NULL,
    "bookingId" INTEGER NOT NULL,
    "status" "ClaimStatus" NOT NULL,
    "reason" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientEmail" TEXT NOT NULL,
    "response" TEXT,

    CONSTRAINT "Claim_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Claim_bookingId_key" ON "Claim"("bookingId");

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
