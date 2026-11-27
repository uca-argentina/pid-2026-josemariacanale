/*
  Warnings:

  - You are about to drop the column `clienteId` on the `CheckIn` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `CheckIn` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "CheckIn" DROP COLUMN "clienteId",
DROP COLUMN "email";
