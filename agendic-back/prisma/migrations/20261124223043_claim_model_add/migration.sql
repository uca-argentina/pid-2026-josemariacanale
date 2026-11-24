/*
  Warnings:

  - You are about to drop the column `clientEmail` on the `Claim` table. All the data in the column will be lost.
  - You are about to drop the column `clientName` on the `Claim` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Claim" DROP COLUMN "clientEmail",
DROP COLUMN "clientName",
ADD COLUMN     "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "status" SET DEFAULT 'OPEN';
