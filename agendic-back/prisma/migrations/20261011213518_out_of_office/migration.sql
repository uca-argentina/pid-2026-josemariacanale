-- CreateEnum
CREATE TYPE "OutOfOfficeReason" AS ENUM ('UNSPECIFIED', 'VACATION', 'TRAVEL', 'SICK_LEAVE', 'PUBLIC_HOLIDAY');

-- CreateTable
CREATE TABLE "OutOfOffice" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "reason" "OutOfOfficeReason" NOT NULL,
    "notes" TEXT,
    "showNotePublicly" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "OutOfOffice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OutOfOffice_userId_idx" ON "OutOfOffice"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "OutOfOffice_userId_startDate_endDate_key" ON "OutOfOffice"("userId", "startDate", "endDate");

-- AddForeignKey
ALTER TABLE "OutOfOffice" ADD CONSTRAINT "OutOfOffice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
